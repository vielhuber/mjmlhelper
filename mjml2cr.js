class mjml2cr
{
    static convert()
    {
        fs.copySync(process.cwd()+'/index.html', process.cwd()+'/index-original.html', { overwrite: true });
        let data = fs.readFileSync(process.cwd()+'/index.html', 'utf-8');
        data = this.modifyHtml(data);
        fs.writeFileSync(process.cwd()+'/index.html', data, 'utf-8');
        fs.copySync(process.cwd()+'/index.html', process.cwd()+'/index-converted.html', { overwrite: true });
        this.zipFolder(() =>
        {
            fs.moveSync(process.cwd()+'/index-original.html', process.cwd()+'/index.html', { overwrite: true });
            fs.removeSync(process.cwd()+'/index-original.html');
        });
    }

    static zipFolder(callback)
    {
        let output = fs.createWriteStream(process.cwd()+'/index.zip'),
            archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(output);
        archive.file('index.html');
        archive.directory('_img/', false);
        output.on('close', callback);
        archive.finalize();
    }

    static modifyHtml(data)
    {
        data = this.addStyles(data);
        data = this.moveImagesFolder(data);
        data = this.attachLoops(data);
        data = this.attachHtmlTags(data);
        return data;
    }

    static addStyles(data)
    {
        let style_tag = '<style type="text/css">',
            pos = data.indexOf(style_tag)+style_tag.length;
        data = data.substring(0, pos) + ' .mj-container { max-width:600px;margin:0 auto; } ' + data.substring(pos);
        return data;
    }

    static attachLoops(data)
    {
        let pos;

        // mid
        data = data.replace(/<!\[endif\]-->(\s*)(\n*)(\s*)<!--\[if mso \| IE\]>/g, '<![endif]-->\n\n\n\n<!--#/loopitem#--><!--#loopitem#-->\n\n\n\n<!--[if mso | IE]>');

        // last
        pos = data.lastIndexOf('<![endif]--></div>');
        data = data.substring(pos, 0) + '<![endif]-->'+'\n\n\n\n<!--#/loopitem#--><!--#/loop#-->\n\n\n\n'+'</div>' + data.substring(pos+'<![endif]--></div>'.length);

        // first
        pos = data.indexOf('<div class="mj-container"');
        pos = data.indexOf('<!--[if mso | IE]>', pos);
        data = data.substring(pos, 0) + '\n\n\n\n<!--#loop #--><!--#loopitem#-->\n\n\n\n' + data.substring(pos);
        
        return data;
    }

    static loopDetermineBegin(data, mid)
    {
        return data.substring(0, mid).lastIndexOf('<!--[if mso');
    }

    static loopDetermineEnd(data, mid)
    {
        let begin = data.lastIndexOf('<div', mid),
            end = data.indexOf('</div>', mid)+'</div>'.length,
            string = data.substring(begin, end);
        // check string has more opening divs as closing divs
        while( this.findAllPositions('<div', string).length != this.findAllPositions('</div>', string).length )
        {
            end = data.indexOf('</div>', end+1)+'</div>'.length;
            string = data.substring(begin, end);
        }
        end = data.indexOf('<![endif]-->', end)+'<![endif]-->'.length
        return end;     
    }

    static attachHtmlTags(data)
    {
        let positions = this.findAllPositions('<![endif]--><div', data);
        let shift = 0;
        positions.forEach((positions__value) =>
        {
            let div_begin = data.indexOf('>', positions__value+shift+'<![endif]--><div'.length)+'>'.length;
            let div_end = data.indexOf('</div><!--[if mso | IE]>', div_begin);
            // only insert if this is no nested tags are inside
            if( data.indexOf('<![endif]--><div', div_begin) > div_end ) 
            {
                data = data.substring(0, div_begin) + '<!--#html #-->' + data.substring(div_begin);
                div_end += '<!--#html #-->'.length;
                data = data.substring(0, div_end) + '<!--#/html#-->' + data.substring(div_end);
                shift += '<!--#html #-->'.length+'<!--#/html#-->'.length;
            }
        });
        return data;
    }

    static moveImagesFolder(data)
    {
        return data.split('_img/').join('');
    }

    static findAllPositions(searchStr, str)
    {
        let searchStrLen = searchStr.length,
            startIndex = 0,
            index,
            indices = [];
        if(searchStrLen == 0)
        {
            return [];
        }
        while((index = str.indexOf(searchStr, startIndex)) > -1)
        {
            indices.push(index);
            startIndex = index + searchStrLen;
        }
        return indices;
    }

    static mail()
    {
        let config = require(process.cwd()+'/mjml2cr.json'),
            transporter = nodemailer.createTransport({
                host: config.smtp,
                port: config.port,
                secure: ((config.ssl !== false)?(true):(false)),
                auth: {
                    user: config.username,
                    pass: config.password
                }
            }),
            message = {
                from: '"Testmail 👻" <'+config.from+'>',
                to: config.to,
                subject: 'Test E-Mail ✔',
                generateTextFromHTML: true,
                html: fs.readFileSync(process.cwd()+'/index.html', 'utf-8'),
                attachments: []
            }

        message = this.embedInlineImages(message);

        transporter.sendMail(message, (error, info) => {
            if (error) { return console.log(error); }
        });
    }

    static embedInlineImages(message)
    {
        message.html = message.html.replace(/<img[^>]*>/gi, function (imgTag)
        {
          return imgTag.replace(/\b(src\s*=\s*(?:['"]?))([^'"> ]+)/i, function (src, prefix, url)
          {
            let cid = (~~(Math.random()*(9999-1000+1))+1000)+'@possible';
            message.attachments.push({
              filename: (url || '').trim(),
              path: process.cwd()+'/'+(url || '').trim(),
              cid: cid
            });
            return (prefix || '') + 'cid:' + cid;
          });
        });
        return message;
    }

};

const fs = require('fs-extra'),
      archiver = require('archiver'),
      nodemailer = require('nodemailer');

if( process.argv.slice(2)[0] == 'convert' )
{
    mjml2cr.convert();
    console.log('successfully created index.zip');
}
else if( process.argv.slice(2)[0] == 'mail' )
{
    mjml2cr.mail();
    console.log('successfully sent out test mail');
}
else
{
    console.log('missing options. possible options: convert, mail');
}