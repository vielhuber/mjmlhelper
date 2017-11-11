# 🌈 mjml2cr 🌈

mjml2cr is a simple converter that makes html files from [mjml](https://mjml.io) usable in [CleverReach](https://www.cleverreach.com/en/).
it also includes a mail function and a small boilerplate.

## installation

```
npm init -y && npm install mjml2cr --save
```

## setup

create a tiny mail credential config file
```
cp mjml2cr.example.json mjml2cr.json
```
and insert your smtp credentials
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

if you want a small mjml boilerplate, simply copy it out
```
cp ./node_modules/mjml2cr/boilerplate/* *
```

## usage

```
# do your daily mjml stuff
node ./node_modules/mjml/bin/mjml --watch index.mjml -o index.html

# send out a test mail (local images are automatically inlined)
node ./node_modules/mjml2cr/mjml2cr.js mail

# create a ready-to-import zip file for CleverReach
node ./node_modules/mjml2cr/mjml2cr.js convert
```