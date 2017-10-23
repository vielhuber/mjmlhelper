# 🌈 mjml2cr 🌈

mjml2cr is a simple converter that makes html files from [mjml](https://mjml.io) usable in [CleverReach](https://www.cleverreach.com/en/).

## Installation

```
npm install mjml2cr --save
```

## Setup

# create a tiny mail credential config file
```
vi mjml2cr.js
```
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

## Usage

```
# do your daily mjml stuff
node ./node_modules/.bin/mjml index.mjml -o index.html
# send out a test mail (local images are automatically inlined)
node ./node_modules/mjml2cr/mjml2cr.js mail
# create a ready-to-import zip file for CleverReach
node ./node_modules/mjml2cr/mjml2cr.js convert
```