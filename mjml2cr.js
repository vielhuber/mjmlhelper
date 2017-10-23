class mjml2cr
{
	static convert()
	{
		fs.copySync('index.html', 'index-original.html', { overwrite: true });
		let data = fs.readFileSync('index.html', 'utf-8');
		data = this.modifyHtml(data);
		fs.writeFileSync('index.html', data, 'utf-8');
		fs.copySync('index.html', 'index-converted.html', { overwrite: true });
		this.zipFolder(() =>
		{
			fs.moveSync('index-original.html', 'index.html', { overwrite: true });
			fs.removeSync('index-original.html');
		});
	}

	static zipFolder(callback)
	{
		let output = fs.createWriteStream(__dirname+'/index.zip'),
			archive = archiver('zip', { zlib: { level: 9 } });
		archive.pipe(output);
		archive.file('index.html');
		archive.glob('*.jpg');
		archive.glob('*.png');
		output.on('close', callback);
		archive.finalize();
	}

	static modifyHtml(data)
	{
		data = this.addStyles(data);
		data = this.attachLoops(data);
		data = this.attachHtmlTags(data);
		return data;
	}

	static addStyles(data)
	{
		let style_tag = '<style type="text/css">';
		let pos = data.indexOf(style_tag)+style_tag.length;
		data = data.substring(0, pos) + ' .mj-container { max-width:600px;margin:0 auto; } ' + data.substring(pos);
		return data;
	}

	static attachLoops(data)
	{
		let loop_begin = '\n\n\n\n<!--#loopitem#-->\n\n\n\n';
		let loop_end = '\n\n\n\n<!--#/loopitem#-->\n\n\n\n';
		let positions = this.findAllPositions('max-width:', data);
		let shift = 0;
		positions.forEach((positions__value) =>
		{
			let mid = positions__value+shift;
			if( data.lastIndexOf('<div', mid) === -1 || data.indexOf('</div>', mid) === -1 ) { return; }
			let begin = this.loopDetermineBegin(data, mid);
			data = data.substring(0, begin) + loop_begin + data.substring(begin);
			mid += loop_begin.length;
			let end = this.loopDetermineEnd(data, mid);
			data = data.substring(0, end) + loop_end + data.substring(end);
			shift += loop_begin.length+loop_end.length;
		});

		// attach outer loop
		let loop_first = data.indexOf('<!--#loopitem#-->');
		data = data.substring(0, loop_first)+'<!--#loop #-->'+data.substring(loop_first);
		let loop_last = data.lastIndexOf('<!--#/loopitem#-->')+'<!--#/loopitem#-->'.length;
		data = data.substring(0, loop_last)+'<!--#/loop#-->'+data.substring(loop_last);
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
		let config = require('./mjml2cr.json'),
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
		        html: fs.readFileSync('index-converted.html', 'utf-8'),
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