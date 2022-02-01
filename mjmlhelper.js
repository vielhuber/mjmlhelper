class mjmlhelper {
    static config() {
        return require(process.cwd() + '/mjmlhelper.json');
    }

    static runMjml(type) {
        const { execSync } = require('child_process'),
            fs = require('fs');
        let path = '.';
        if (!fs.existsSync('./node_modules')) {
            path = '..';
        }
        execSync('node ' + path + '/node_modules/mjml/bin/mjml index.mjml -o index.html');
    }

    static runMjmlAfterwork(type) {
        let data = fs.readFileSync(process.cwd() + '/index.html', 'utf-8');
        data = this.modifyHtml(data, type);
        fs.writeFileSync(process.cwd() + '/index.html', data, 'utf-8');
    }

    static generateZip(type) {
        fs.copySync(process.cwd() + '/index.html', process.cwd() + '/index-original.html', {
            overwrite: true
        });

        let data = fs.readFileSync(process.cwd() + '/index.html', 'utf-8');
        if (type === 'cleverreach') {
            data = this.addCleverReachStyles(data);
        }
        if (type === 'mailchimp') {
            data = this.addMailchimpStyles(data);
        }
        data = this.moveImagesFolder(data);
        fs.writeFileSync(process.cwd() + '/index.html', data, 'utf-8');

        fs.copySync(process.cwd() + '/index.html', process.cwd() + '/index-converted.html', {
            overwrite: true
        });
        this.zipFolder(() => {
            fs.moveSync(process.cwd() + '/index-original.html', process.cwd() + '/index.html', {
                overwrite: true
            });
            fs.removeSync(process.cwd() + '/index-original.html');
        });

        console.log('successfully created index.zip');
    }

    static zipFolder(callback) {
        let output = fs.createWriteStream(process.cwd() + '/index.zip'),
            archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(output);
        archive.file('index.html');
        archive.directory('_assets/', false);
        output.on('close', callback);
        archive.finalize();
    }

    static modifyHtml(data, type) {
        data = this.doSomeHacks(data);
        data = this.replaceDummyLinks(data, type === 'mail' ? true : false);
        data = this.mergeStyleTagsIntoOne(data);
        data = this.addHelperClasses(data);
        return data;
    }

    static addCleverReachStyles(data) {
        let style_tag = '<style type="text/css">',
            pos = data.indexOf(style_tag) + style_tag.length,
            positions = null,
            shift = 0;
        // set max width to container so that in cleverreach editor modules are good visible
        data =
            data.substring(0, pos) +
            ' body[spellcheck="false"] > div:first-child, body[spellcheck="false"] > div:first-child + div { max-width:600px;margin:0 auto; } ' +
            data.substring(pos);
        // hide tinymce overlay that always goes in the way
        data =
            data.substring(0, pos) +
            ' .mce-tinymce-inline.mce-floatpanel { display:none !important; } ' +
            data.substring(pos);
        // hide modal overlay
        data = data.substring(0, pos) + ' body.cred_modal:before { display: none !important; } ' + data.substring(pos);

        // placeholders
        data = this.replaceAll(data, '%UNSUBSCRIBE%', '{UNSUBSCRIBE}');
        data = this.replaceAll(data, '%WEBVERSION%', '{ONLINE_VERSION}');
        data = this.replaceAll(data, '%PREVIEWTEXT%', '{CAMPAIGN}');

        // loop items
        data = this.replaceFirst(data, '<!-- flexibles -->', '<!--#loop#--><!--#loopitem#-->');
        data = this.replaceLast(data, '<!-- /flexibles -->', '<!--#/loopitem#--><!--#/loop#-->');
        positions = this.findAllPositions('<!-- flexible', data);
        shift = 0;
        positions.forEach((positions__value, positions__key) => {
            if (positions__key === 0) {
                return;
            }
            let begin = positions__value + shift,
                end = data.indexOf('-->', begin) + '-->'.length,
                tag = '<!--#/loopitem#--><!--#loopitem#-->';
            data = data.substring(0, begin) + tag + data.substring(end);
            shift += tag.length - (end - begin);
        });

        // first and last tag
        positions = this.findAllPositions(' mj-outlook-group-fix', data).concat(
                    this.findAllPositions('mj-hero-content', data).concat(
                    []));
        positions.sort();
        shift = 0;
        positions.forEach(positions__value => {
            let begin = data.indexOf('>', positions__value + shift) + '>'.length,
                pointer = begin,
                level = 1;
            while (level != 0) {
                if (data.substring(pointer, pointer + '<div'.length) === '<div') {
                    level++;
                }
                if (data.substring(pointer, pointer + '</div>'.length) === '</div>') {
                    level--;
                }
                pointer++;
            }
            let end = pointer - 1;
            data = data.substring(0, begin) + '<!--#html #-->' + data.substring(begin);
            end += '<!--#html #-->'.length;
            data = data.substring(0, end) + '<!--#/html#-->' + data.substring(end);
            shift += '<!--#html #-->'.length + '<!--#/html#-->'.length;
        });
        // prevent nested html tags (cleverreach has problems with that)
        data = data.replace(/(<!--#html #-->)(((?!<!--#\/html#-->).)*(<!--#html #-->))/gs,'$2');
        data = data.replace(/((<!--#\/html#-->)((?!<!--#html #-->).)*)(<!--#\/html#-->)/gs,'$1');

        return data;
    }

    static addMailchimpStyles(data) {
        let positions,
            shift,
            style_tag = '<style type="text/css">',
            pos = data.indexOf(style_tag) + style_tag.length;

        // when replacing images in mailchimp, style="width:" is set to a fixed size. we prevent this with
        data = data.substring(0, pos) + ' img { max-width:100%; height:auto !important; } ' + data.substring(pos);

        // increase ordering icon
        // also there is a bug in mailchimp: when adding a new module and changing it's type, the ID is lost and the element cannot be moved; we fix this also here (we simply hide the move icon when the ID is missing)
        data =
            data.substring(0, pos) +
            ' .tpl-repeatmovewrap>.tpl-repeatmove { background-color: #fff !important; top: -10px !important; left: -20px !important; width: 100px !important; height: 50px !important; border:2px solid grey !important; background-position:center !important; display:none !important; } div[mcrepeatable][id] .tpl-repeatmovewrap>.tpl-repeatmove { display: block !important; } ' +
            data.substring(pos);

        // remove hide icon
        data =
            data.substring(0, pos) +
            ' .tpl-repeatwrap.can-hide .tpl-hidetoggle { display:none !important; } ' +
            data.substring(pos);

        // placeholders
        data = this.replaceAll(data, '%UNSUBSCRIBE%', '*|UNSUB|*');
        data = this.replaceAll(data, '%WEBVERSION%', '*|ARCHIVE|*');
        data = this.replaceAll(data, '%PREVIEWTEXT%', '*|MC_PREVIEW_TEXT|*');

        // mc:edit
        positions = this.findAllPositions(' mj-outlook-group-fix', data);
        shift = 0;
        positions.forEach(positions__value => {
            let pos = data.indexOf('"', positions__value + shift) + '"'.length,
                tag = ' mc:edit="_' + positions__value + '"';
            data = data.substring(0, pos) + tag + data.substring(pos);
            shift += tag.length;
        });

        // mc:repeatable
        data = this.replaceFirst(data, '<!-- flexibles -->', '');
        data = this.replaceLast(data, '<!-- /flexibles -->', '</div>');
        positions = this.findAllPositions('<!-- flexible', data);
        shift = 0;
        positions.forEach((positions__value, positions__key) => {
            let begin = positions__value + shift,
                end = data.indexOf('-->', begin) + '-->'.length,
                begin_name = data.indexOf('"', positions__value + shift) + '"'.length,
                end_name = data.indexOf('"', begin_name),
                tag = '<div mc:repeatable="content" mc:variant="' + data.substring(begin_name, end_name) + '">';
            if (positions__key > 0) {
                tag = '</div>' + tag;
            }
            data = data.substring(0, begin) + tag + data.substring(end);
            shift += tag.length - (end - begin);
        });

        return data;
    }

    static addHelperClasses(data) {
        // these classes are important, because gmail does not support any data attributes to target iphone responsive styles
        const jsdom = require('jsdom'),
            { JSDOM } = jsdom;
        let dom = new JSDOM(data);
        dom.window.document.querySelectorAll('[style*="font-size"]').forEach(el => {
            el.classList.add('font-size-' + el.style.fontSize);
        });
        dom.window.document.querySelectorAll('[style*="text-align"]').forEach(el => {
            el.classList.add('text-align-' + el.style.textAlign);
        });
        dom.window.document.querySelectorAll('[class*="mj-column-per-"]').forEach(el => {
            el.classList.add('mj-column-per-X');
        });
        dom.window.document.querySelectorAll('[class*="mj-column-"]').forEach(el => {
            el.classList.add('mj-column-X');
        });
        return dom.serialize();
    }

    static mergeStyleTagsIntoOne(data) {
        let css = '',
            positions = this.findAllPositions('<style type="text/css">', data),
            shift = 0;
        positions.forEach(positions__value => {
            let begin = positions__value + shift,
                end = data.indexOf('</style>', begin) + '</style>'.length,
                begin_inner = data.indexOf('>', begin) + '>'.length,
                end_inner = data.indexOf('</style>', begin);
            // if this is inside ie condition, skip
            let pointer = begin;
            while (data.substring(pointer - 1, pointer) == ' ') {
                pointer--;
            }
            if (data.substring(pointer - 3, pointer - 1) == ']>') {
                return;
            }
            css += data.substring(begin_inner, end_inner);
            data = data.substring(0, begin) + data.substring(end);
            shift = shift - (end - begin);
        });
        // minify
        css = css.replace(/\r?\n?/g, '').trim();
        data = data.replace('<head>', '<head><style type="text/css">' + css + '</style>');
        return data;
    }

    static doSomeHacks(data) {
        // gmx/web.de desktop: enable multi column layout
        for (var i = 0; i <= 100; i++) {
            data = data
                .split('.mj-column-per-' + i + ' { width:' + i + '% !important; }')
                .join('.mj-column-per-' + i + ' { width:' + i + '% !important;max-width:' + i + '%; }');
        }

        // yahoo.com has a weird bug: when using google fonts, @import gets stripped out and the follow rule is killed; circumvent that
        if (data.indexOf('@import url(') > -1) {
            let pos = data.indexOf(');', data.indexOf('@import url('));
            data = data.substring(0, pos + 2) + ' .dummyclass{} ' + data.substring(pos + 2);
        }

        // prevent times new roman on outlook <2016
        let pos = data.indexOf('font-family:');
        if (pos > -1) {
            let font_family = data.substring(pos + 'font-family:'.length, data.indexOf(';', pos)).trim();
            // we have to do this exactly like this, because cleverreach merges together all styles and ignores mso
            data = data.replace(
                '<style type="text/css">',
                '<style type="text/css">.outlook, .outlook table, .outlook td, .outlook h1, .outlook h2, .outlook h3, .outlook h4, .outlook h5, .outlook h6, .outlook p, .outlook span, .outlook strong, .outlook div, .outlook a { font-family: ' +
                    font_family +
                    ', Arial, Helvetica, sans-serif !important; }</style>\n<style type="text/css">'
            );
            let pos2 = data.indexOf('>', data.indexOf('<body')) + '>'.length;
            data = data.substring(0, pos2) + '<!--[if mso]><div class="outlook"><![endif]-->' + data.substring(pos2);
            data = data.replace('</body>', '<!--[if mso]></div><![endif]--></body>');
        }

        return data;
    }

    static replaceDummyLinks(data, with_codes = true) {
        data = data.split('href="#"').join('href="https://test.de"');
        if (with_codes === true) {
            data = data
                .split('href="%UNSUBSCRIBE%"')
                .join('href="https://test.de"')
                .split('href="%WEBVERSION%"')
                .join('href="https://test.de"')
                .split('href="%PREVIEWTEXT%"')
                .join('href="https://test.de"');
        }
        return data;
    }

    static moveImagesFolder(data) {
        return data.split('_assets/').join('');
    }

    static findAllPositions(searchStr, str) {
        let searchStrLen = searchStr.length,
            startIndex = 0,
            index,
            indices = [];
        if (searchStrLen == 0) {
            return [];
        }
        while ((index = str.indexOf(searchStr, startIndex)) > -1) {
            indices.push(index);
            startIndex = index + searchStrLen;
        }
        return indices;
    }

    static mail(type) {
        let transporter = nodemailer.createTransport({
                host: this.config().smtp,
                port: this.config().port,
                secure: this.config().ssl !== false ? true : false,
                auth: {
                    user: this.config().username,
                    pass: this.config().password
                }
            }),
            data = fs.readFileSync(process.cwd() + '/index.html', 'utf-8'),
            message = {
                from: '"' + this.config().name + '" <' + this.config().from + '>',
                to: null, // will be set later
                subject: this.fetchSubject(data),
                generateTextFromHTML: true,
                html: data,
                attachments: []
            };

        if (this.config().images == 'inline') {
            console.log('inlining images...');
            message = this.inlineImages(message);
        } else if (this.config().images == 'upload') {
            console.log('uploading images...');
            // this is asynchrionus but we simply do process further
            message.html = this.uploadImages(message.html);
        }

        fs.writeFileSync(process.cwd() + '/index-converted.html', message.html, 'utf-8');

        let to = this.config().to;
        if (to instanceof Array) {
            to = to;
        } else if (to.indexOf('.txt') > -1) {
            to = fs.readFileSync(to, 'utf-8');
            to = to.replace(/\r\n/g, '\n');
            to = to.replace(/\r/g, '\n');
            to = to.split('\n');
        } else {
            to = [to];
        }
        if (this.config().log !== undefined) {
            fs.writeFileSync(this.config().log, '', 'utf-8');
        }
        to.forEach((value, index) => {
            setTimeout(() => {
                message.to = value;
                transporter.sendMail(message, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('successfully sent out mail to ' + info.envelope.to);
                    info.time =
                        ('0' + new Date().getDate()).slice(-2) +
                        '.' +
                        ('0' + (new Date().getMonth() + 1)).slice(-2) +
                        '.' +
                        new Date().getFullYear() +
                        ' ' +
                        ('0' + new Date().getHours()).slice(-2) +
                        ':' +
                        ('0' + new Date().getMinutes()).slice(-2) +
                        ':' +
                        ('0' + new Date().getSeconds()).slice(-2);
                    if (this.config().log !== undefined) {
                        fs.appendFileSync('log.txt', JSON.stringify(info) + '\n', 'utf-8');
                    }
                });
            }, 1000 * index);
        });
    }

    static uploadImages(data) {
        let positions = this.findAllPositions('_assets/', data),
            shift = 0,
            filenames = [],
            ftp = new Client();
        if (positions.length === 0) {
            return data;
        }
        positions.forEach((positions__value, positions__key) => {
            positions__value += shift;
            let begin =
                Math.max(
                    data.lastIndexOf('"', positions__value + 1),
                    data.lastIndexOf('(', positions__value + 1),
                    data.lastIndexOf("('", positions__value + 1) + 1
                ) + 1;
            let end = Math.min(
                data.indexOf('"', positions__value) > -1 ? data.indexOf('"', positions__value) : data.length,
                data.indexOf(')', positions__value) > -1 ? data.indexOf(')', positions__value) : data.length,
                data.indexOf("')", positions__value) > -1 ? data.indexOf("')", positions__value) : data.length
            );
            let image = data.substring(begin, end);
            filenames.push(image);
            image = image.replace('_assets/', '');
            let url = this.config().ftp.url + '/' + image;
            data = data.substring(0, begin) + url + data.substring(end);
            shift += url.length - (end - begin);
        });
        ftp.on('ready', () => {
            filenames.forEach((filenames__value, filenames__key) => {
                ftp.put(
                    process.cwd() + '/' + filenames__value,
                    this.config().ftp.path + filenames__value.replace('_assets/', ''),
                    error => {
                        if (error) {
                            throw error;
                        }
                        if (filenames__key >= filenames.length - 1) {
                            ftp.end();
                        }
                    }
                );
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

    static inlineImages(message) {
        let positions = this.findAllPositions('_assets/', message.html);
        if (positions.length > 0) {
            let shift = 0;
            positions.forEach(positions__value => {
                let cid = ~~(Math.random() * (9999 - 1000 + 1)) + 1000 + '@possible';
                let cid_label = 'cid:' + cid;
                positions__value += shift;
                let begin =
                    Math.max(
                        message.html.lastIndexOf('"', positions__value + 1),
                        message.html.lastIndexOf('(', positions__value + 1)
                    ) + 1;
                let end = Math.min(
                    message.html.indexOf('"', positions__value) > -1
                        ? message.html.indexOf('"', positions__value)
                        : message.html.length,
                    message.html.indexOf(')', positions__value) > -1
                        ? message.html.indexOf(')', positions__value)
                        : message.html.length
                );
                let url = message.html.substring(begin, end);
                if (url.indexOf('.jpg') === -1 && url.indexOf('.gif') === -1 && url.indexOf('.png') === -1) {
                    return;
                }
                message.html = message.html.substring(0, begin) + cid_label + message.html.substring(end);
                shift += cid_label.length - (end - begin);
                message.attachments.push({
                    filename: url.trim(),
                    path: process.cwd() + '/' + url.trim(),
                    cid: cid
                });
            });
        }
        return message;
    }

    static fetchSubject(data) {
        let begin = data.indexOf('<title>') + '<title>'.length,
            end = data.indexOf('</title>');
        return data.substring(begin, end);
    }

    static replaceAll(string, search, replace) {
        return string.split(search).join(replace);
    }

    static replaceLast(string, search, replace) {
        let n = string.lastIndexOf(search);
        string = string.slice(0, n) + string.slice(n).replace(search, replace);
        return string;
    }

    static replaceFirst(string, search, replace) {
        return string.replace(search, replace);
    }
}

const fs = require('fs-extra'),
    archiver = require('archiver'),
    nodemailer = require('nodemailer'),
    Client = require('ftp'),
    type = process.argv.slice(2)[0];

if (type === 'cleverreach' || type === 'mailchimp') {
    mjmlhelper.runMjml(type);
    mjmlhelper.runMjmlAfterwork(type);
    mjmlhelper.generateZip(type);
} else if (type === 'mail') {
    mjmlhelper.runMjml(type);
    mjmlhelper.runMjmlAfterwork(type);
    mjmlhelper.mail(type);
} else if (type === 'build') {
    mjmlhelper.runMjml(type);
    mjmlhelper.runMjmlAfterwork(type);
} else {
    console.log('missing options');
}
