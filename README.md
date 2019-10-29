# 🌈 mjmlhelper 🌈

mjmlhelper is a little toolbox for [mjml](https://mjml.io/) (v4.X) that...

-   sends mails from the command line for testing and production,
-   automatically inlines or uploads images for testing purposes,
-   converts your template to the drag&drop editors of [CleverReach](https://www.cleverreach.com) and [Mailchimp](https://mailchimp.com).

it also includes a small boilerplate and some nifty updates for mjml.

## installation

```
npm init -y
npm install mjmlhelper
```

## setup

copy out a small mjml boilerplate:

```
cp -r ./node_modules/mjmlhelper/boilerplate/* .
cp example.mjmlhelper.json mjmlhelper.json
cp example.gitignore .gitignore
```

then edit your smtp credentials in mjmlhelper.json for sending out emails:

```json
{
    "from": "from@tld.com",
    "name": "Testmailer",
    "smtp": "your.hostname.com",
    "username": "your-username",
    "password": "your-password",
    "port": 465,
    "ssl": "tls",

    "to": "to@tld.com",
    "to": ["to@tld.com", "to2@tld.com"],
    "to": "list.txt",

    "images": false,
    "images": "inline",
    "images": "upload",

    "log": "log.txt",
    "ftp": {
        "host": "localhost",
        "port": 21,
        "username": "foo",
        "password": "bar",
        "path": "/path/to/folder/",
        "url": "https://tld.com/path/to/folder"
    }
}
```

## usage

do your daily mjml stuff

```
node ./node_modules/mjml/bin/mjml -w index.mjml -o index.html
```

send out mail

```
node ./node_modules/mjmlhelper/mjmlhelper.js mail
```

create a ready-to-import zip file for CleverReach

```
node ./node_modules/mjmlhelper/mjmlhelper.js cleverreach
```

create a ready-to-import zip file for Mailchimp

```
node ./node_modules/mjmlhelper/mjmlhelper.js mailchimp
```

## placeholders

### auto

-   `%UNSUBSCRIBE%`
-   `%WEBVERSION%`
-   `%PREVIEWTEXT%`

### cleverreach

-   `{UNSUBSCRIBE}`
-   `{ONLINE_VERSION}`
-   `{CAMPAIGN}`

### mailchimp

-   `*|UNSUB|*`
-   `*|ARCHIVE|*`
-   `*|MC_PREVIEW_TEXT|*`
