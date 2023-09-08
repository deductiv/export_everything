#!/bin/bash
export NODE_OPTIONS=--openssl-legacy-provider
export NODE_ENV="development"
export APP_NAME="export_everything"
yarn install
yarn dev
