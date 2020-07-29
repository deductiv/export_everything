[![Build Status](https://travis-ci.org/dsoprea/RijndaelPbkdf.svg?branch=master)](https://travis-ci.org/dsoprea/RijndaelPbkdf)

## Overview

This package was a remedy to there being no PyPI-published, pure-Python 
Rijndael (AES) implementations, and that nothing available, in general, was 
compatible with both Python2 *and* Python3. The same is true of the PBKDF2 
key-expansion algorithm.

The encryptor takes a source generator (which yields individual blocks). There 
are source-generators provided for both data from a variable and data from a 
file. It is trivial if you'd like to write your own. The encryptor and 
decryptor functions are written as generators. Decrypted data has PKCS7
padding. A utility function is provided to trim this (*trim_pkcs7_padding*).

The implementation includes Python2 and Python3 implementations of both 
Rijndael and PBKDF2, and chooses the version when loaded.

The default block-size is 128-bits in order to be compatible with AES.

This project is also referred to as *pprp*, which stands for "Pure Python 
Rijndael and PBKDF2".


## Installation

Install via *pip*:

```
$ sudo pip install pprp
```


## Example

Encrypt and decrypt the data, and compare the results. This was copied directly
from the unit-test.

```python
passphrase = 'password'.encode('ASCII')
salt = 'salt'.encode('ASCII')

key_size = 32
data = "this is a test" * 100
data_bytes = data.encode('ASCII')

key = pprp.pbkdf2(passphrase, salt, key_size)

# Create a source from available data.
sg = pprp.data_source_gen(data_bytes)

# Feed the source into the encryptor.
eg = pprp.rijndael_encrypt_gen(key, sg)

# Feed the encryptor into the decryptor.
dg = pprp.rijndael_decrypt_gen(key, eg)

# Sink the output into an IO-stream.
decrypted = pprp.decrypt_sink(dg)

# self.assertEquals(data_bytes, decrypted)
```


## Notes

The generators can take a block-size in the event that you don't want the 
default. The default block-size can also be changed via the PPRP_BLOCK_SIZE 
environment variable.
