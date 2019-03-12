#!/bin/bash

echo 'Creating SSL certificates with Certbot...'
certbot --nginx -d pred.runebase.io -d testpred.runebase.io -d regpred.runebase.io
