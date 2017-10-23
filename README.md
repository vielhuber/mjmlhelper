# 🌈 mjml2cr 🌈

mjml2cr is a simple converter that makes html files from [mjml](https://mjml.io) usable in [CleverReach](https://www.cleverreach.com/en/).

## installation

```
npm install mjml2cr --save
```

## setup

create a tiny mail credential config file
```
touch mjml2cr.json
```
with the following content:
```json
{
    "from": "from@tld.com",
    "to": "to@tld.com",
    "smtp": "your.hostname.com",
    "username": "your-username",
    "password": "your-password",
    "port": 465,
    "ssl": "tls"
}
```

## usage

```
# do your daily mjml stuff
node ./node_modules/mjml/bin/mjml index.mjml -o index.html
# send out a test mail (local images are automatically inlined)
node ./node_modules/mjml2cr/mjml2cr.js mail
# create a ready-to-import zip file for CleverReach
node ./node_modules/mjml2cr/mjml2cr.js convert
```