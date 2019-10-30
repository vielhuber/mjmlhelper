# 🌈 mjmlhelper 🌈

mjmlhelper is a little toolbox for [mjml](https://mjml.io/) (v4.X) that...

-   sends mails from the command line for testing and production,
-   automatically inlines or uploads images for testing purposes,
-   converts your template to the drag&drop editors of [CleverReach](https://www.cleverreach.com) and [Mailchimp](https://mailchimp.com).

it also includes a small boilerplate and some nifty updates for mjml.

## installation

```
npm install mjmlhelper
```

## setup

copy out all boilerplate files:

```
cp -r ./node_modules/mjmlhelper/boilerplate/* .
```

then edit your smtp credentials in `mjmlhelper.json` for sending out emails:

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

build mjml (and watch)

```
npm run watch
```

build mjml

```
npm run build
```

send out mail

```
npm run mail
```

create a ready-to-import zip file for CleverReach

```
npm run cleverreach
```

create a ready-to-import zip file for Mailchimp

```
npm run mailchimp
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
