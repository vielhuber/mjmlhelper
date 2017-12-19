class mjmlhelper
{    

    static config()
    {
        return require(process.cwd()+'/mjmlhelper.json');
    }

    static cleverreach()
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
        data = this.addCleverReachStyles(data);
        data = this.doSomeHacks(data);
        data = this.moveImagesFolder(data);
        data = this.attachLoops(data);
        data = this.attachHtmlTags(data);
        return data;
    }

    static addCleverReachStyles(data)
    {
        let style_tag = '<style type="text/css">',
            pos = data.indexOf(style_tag)+style_tag.length;
        // set max width to container so that in cleverreach editor modules are good visible
        data = data.substring(0, pos)+' .mj-container { max-width:600px;margin:0 auto; } '+data.substring(pos);
        // hide tinymce overlay that always goes in the way
        data = data.substring(0, pos)+' .mce-tinymce-inline.mce-floatpanel { display:none !important; } ' +data.substring(pos);
        // hide modal overlay
        data = data.substring(0, pos)+' body.cred_modal:before { display: none !important; } ' +data.substring(pos);
        // cleverreach merges all styles together
        // now outlook-group-fix fails on gmail: remove that rule
        data = data.replace('.outlook-group-fix {','.disabled-outlook-group-fix {');
        // now @ms-viewport and @viewport fails on gmail: remove that rule
        data = data.replace('@-ms-viewport {','.disabled-ms-viewport {');
        data = data.replace('@viewport {','.disabled-viewport {');
        return data;
    }

    static doSomeHacks(data)
    {
        // gmx/web.de desktop: enable multi column layout
        for( var i = 0; i <= 100; i++ )
        {
            data = data.split('.mj-column-per-'+i+' { width:'+i+'%!important; }').join('.mj-column-per-'+i+' { width:'+i+'%!important;max-width:'+i+'%; }');
        }

        // gmx/web.de mobile: slightly increase breakpoint
        data = data.split('(min-width:480px)').join('(min-width:500px)');

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
        let transporter = nodemailer.createTransport({
                host: this.config().smtp,
                port: this.config().port,
                secure: ((this.config().ssl !== false)?(true):(false)),
                auth: {
                    user: this.config().username,
                    pass: this.config().password
                }
            }),
            message = {
                from: '"Testmail 👻" <'+this.config().from+'>',
                to: null, // will be set later
                subject: 'Test E-Mail ✔',
                generateTextFromHTML: true,
                html: fs.readFileSync(process.cwd()+'/index.html', 'utf-8'),
                attachments: []
            }

        if( this.config().images == 'inline' )
        {
            console.log('inlining images...');
            message = this.inlineImages(message);
        }
        else if( this.config().images == 'upload' )
        {
            console.log('uploading images...');
            // this is asynchrionus but we simply do process further
            message.html = this.uploadImages(message.html);
        }

        // call functions from cleverreach converter (only relevant ones)
        message.html = this.addCleverReachStyles(message.html);
        message.html = this.doSomeHacks(message.html);

        fs.writeFileSync(process.cwd()+'/index-converted.html', message.html, 'utf-8');

        let to = this.config().to;
        if( to instanceof Array )
        {
            to = to;
        }
        else if( to.indexOf('.txt') > -1 )
        {
            to = fs.readFileSync(to, 'utf-8');
            to = to.replace(/\r\n/g,'\n');
            to = to.replace(/\r/g,'\n');
            to = to.split('\n');
        }
        else
        {
            to = [to];
        }
        if( this.config().log !== undefined )
        {
            fs.writeFileSync(this.config().log, '', 'utf-8');
        }
        to.forEach((value, index) =>
        {
            setTimeout(() => {
                message.to = value;
                transporter.sendMail(message, (error, info) =>
                {
                    if (error)
                    {
                        return console.log(error);
                    }
                    console.log('successfully sent out mail to '+info.envelope.to);
                    info.time = ('0'+(new Date()).getDate()).slice(-2)+'.'+('0'+((new Date()).getMonth()+1)).slice(-2)+'.'+(new Date()).getFullYear()+' '+('0'+(new Date()).getHours()).slice(-2)+':'+('0'+(new Date()).getMinutes()).slice(-2)+':'+('0'+(new Date()).getSeconds()).slice(-2);
                    if( this.config().log !== undefined )
                    {
                        fs.appendFileSync('log.txt', JSON.stringify(info)+'\n', 'utf-8');
                    }
                });
            },1000*index);
        });
    }

    static uploadImages(data)
    {
        let positions = this.findAllPositions('_img/',data);
        if( positions.length === 0 )
        {            
            return data;
        }
        let shift = 0;
        positions.forEach((positions__value) =>
        {
            positions__value += shift;
            let begin = Math.max(
                data.lastIndexOf('"',positions__value+1),
                data.lastIndexOf('(',positions__value+1),
                (data.lastIndexOf('(\'',positions__value+1)+1)
            )+1;
            let end = Math.min(
                ((data.indexOf('"',positions__value)>-1)?(data.indexOf('"',positions__value)):(data.length)),
                ((data.indexOf(')',positions__value)>-1)?(data.indexOf(')',positions__value)):(data.length)),
                ((data.indexOf('\')',positions__value)>-1)?(data.indexOf('\')',positions__value)):(data.length))
            );
            let image = data.substring(begin, end);
            this.uploadFile(image);
            image = image.replace('_img/','');
            let url = this.config().ftp.url+'/'+image;
            data = data.substring(0, begin) + url + data.substring(end);
            shift += (url.length-(end-begin));
        });
        return data;
    }

    static uploadFile(filename)
    {
        let ftp = new Client();
        ftp.on('ready', () =>
        {
            ftp.put(process.cwd()+'/'+filename, this.config().ftp.path+filename.replace('_img/',''), (error) =>
            {
                if(error)
                {
                    throw error;
                }
                ftp.end();
            });
        });
        ftp.connect({
            host: this.config().ftp.host,
            port: this.config().ftp.port,
            user: this.config().ftp.username,
            password: this.config().ftp.password 
        });
    }

    static inlineImages(message)
    {
        let positions = this.findAllPositions('_img/',message.html);
        if( positions.length > 0 )
        {
            let shift = 0;
            positions.forEach((positions__value) =>
            {
                let cid = (~~(Math.random()*(9999-1000+1))+1000)+'@possible';
                let cid_label = 'cid:'+cid;
                positions__value += shift;
                let begin = Math.max(
                    message.html.lastIndexOf('"',positions__value+1),
                    message.html.lastIndexOf('(',positions__value+1)
                )+1;
                let end = Math.min(
                    ((message.html.indexOf('"',positions__value)>-1)?(message.html.indexOf('"',positions__value)):(message.html.length)),
                    ((message.html.indexOf(')',positions__value)>-1)?(message.html.indexOf(')',positions__value)):(message.html.length))
                );
                let url = message.html.substring(begin, end);
                if( url.indexOf('.jpg') === -1 && url.indexOf('.gif') === -1 && url.indexOf('.png') === -1 )
                {
                    return;
                }
                message.html = message.html.substring(0, begin) + cid_label + message.html.substring(end);
                shift += (cid_label.length-(end-begin));
                message.attachments.push({
                    filename: url.trim(),
                    path: process.cwd()+'/'+url.trim(),
                    cid: cid
                });
            });
        }
        return message;
    }

};

const fs = require('fs-extra'),
      archiver = require('archiver'),
      nodemailer = require('nodemailer'),
      Client = require('ftp');

if( process.argv.slice(2)[0] == 'cleverreach' )
{
    mjmlhelper.cleverreach();
    console.log('successfully created index.zip');
}
else if( process.argv.slice(2)[0] == 'mail' )
{
    mjmlhelper.mail();
}
else
{
    console.log('missing options. possible options: cleverreach, mail');
}