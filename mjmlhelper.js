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
        archive.directory('_assets/', false);
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
        data = data.substring(0, pos)+' body > div:nth-child(1), body > div:nth-child(2) { max-width:600px;margin:0 auto; } '+data.substring(pos);
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
            data = data.split('.mj-column-per-'+i+' { width:'+i+'% !important; }').join('.mj-column-per-'+i+' { width:'+i+'% !important;max-width:'+i+'%; }');
        }

        // gmx/web.de mobile: slightly increase breakpoint
        data = data.split('(min-width:480px)').join('(min-width:500px)');

        return data;
    }

    static attachLoops(data)
    {
        // first
        data = data.replace(/<\/style>(\s*)(\n*)(\s*)<!--\[if mso \| IE\]>/g, '</style>\n\n\n\n<!--#loop #--><!--#loopitem#-->\n\n\n\n<!--[if mso | IE]>');
        
        // mid
        data = data.replace(/<!--\[if mso \| IE\]>(\s*)(\n*)(\s*)<\/td>(\s*)(\n*)(\s*)<\/tr>(\s*)(\n*)(\s*)<\/table>(\s*)(\n*)(\s*)<table/g, '<!--[if mso | IE]></td></tr></table><![endif]-->\n\n\n\n<!--#/loopitem#--><!--#loopitem#-->\n\n\n\n<!--[if mso | IE]><table');

        // last
        data = data.replace(/<!\[endif\]-->(\s*)(\n*)(\s*)<\/div>(\s*)(\n*)(\s*)<\/body>/g, '<![endif]-->\n\n\n\n<!--#/loopitem#--><!--#/loop#-->\n\n\n\n</div></body>');

        return data;
    }


    static attachHtmlTags(data)
    {
        let positions = this.findAllPositions(' outlook-group-fix', data),
            shift = 0;
        positions.forEach((positions__value) =>
        {
            let begin = data.indexOf('>', positions__value+shift)+'>'.length,
                pointer = begin,
                level = 1;
            while(level != 0)
            {
                if( data.substring(pointer, pointer+'<div'.length) === '<div' )
                {
                    level++;
                }
                if( data.substring(pointer, pointer+'</div>'.length) === '</div>' )
                {
                    level--;
                }
                pointer++;
            }
            let end = pointer-1;
            data = data.substring(0, begin) + '<!--#html #-->' + data.substring(begin);
            end += '<!--#html #-->'.length;
            data = data.substring(0, end) + '<!--#/html#-->' + data.substring(end);
            shift += '<!--#html #-->'.length+'<!--#/html#-->'.length;
        });
        return data;
    }

    static moveImagesFolder(data)
    {
        return data.split('_assets/').join('');
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
            data = fs.readFileSync(process.cwd()+'/index.html', 'utf-8'),
            message = {
                from: '"'+this.config().name+'" <'+this.config().from+'>',
                to: null, // will be set later
                subject: this.fetchSubject(data),
                generateTextFromHTML: true,
                html: data,
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
        let positions = this.findAllPositions('_assets/',data),
            shift = 0,
            filenames = [],
            ftp = new Client();        
        if( positions.length === 0 )
        {            
            return data;
        }
        positions.forEach((positions__value, positions__key) =>
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
            filenames.push(image);
            image = image.replace('_assets/','');
            let url = this.config().ftp.url+'/'+image;
            data = data.substring(0, begin) + url + data.substring(end);
            shift += (url.length-(end-begin));
        });
        ftp.on('ready', () =>
        {
            filenames.forEach((filenames__value, filenames__key) =>
            {
                ftp.put(process.cwd()+'/'+filenames__value, this.config().ftp.path+filenames__value.replace('_assets/',''), (error) =>
                {
                    if(error) {
                        throw error;
                    }
                    if( filenames__key >= filenames.length-1 )
                    {
                        ftp.end();
                    }
                });
            });
        });
        ftp.connect({
            host: this.config().ftp.host,
            port: this.config().ftp.port,
            user: this.config().ftp.username,
            password: this.config().ftp.password
        });
        return data;
    }


    static inlineImages(message)
    {
        let positions = this.findAllPositions('_assets/',message.html);
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

    static fetchSubject(data)
    {
        let begin = data.indexOf('<title>')+('<title>').length,
            end = data.indexOf('</title>');
        return data.substring(begin, end);
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