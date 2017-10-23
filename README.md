# 🌈 mjml2cr 🌈

mjml2cr is a simple converter that makes html files from [mjml](https://mjml.io) usable in [CleverReach](https://www.cleverreach.com/en/).

## Installation

```
mkdir test
cd test
npm install mjml2cr --save
cp mjml2cr.example.js mjml2cr.js
# now edit your test mail credentials
vi mjml2cr.js
```

## Usage

```
# do your daily mjml stuff
./node_modules/.bin/mjml index.mjml -o index.html
# send out a test mail (local images are automatically inlined)
node mjml2cr.js mail
# create a ready-to-import zip file for CleverReach
node mjml2cr.js convert
```