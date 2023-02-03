#!/bin/bash
export NODE_OPTIONS=--openssl-legacy-provider
export NODE_ENV="production"
export APP_NAME="export_everything"
yarn install
yarn build
