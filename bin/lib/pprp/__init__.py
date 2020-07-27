__version__ = '0.2.7'

import pprp.adapters

from pprp.adapters import \
    rijndael_encrypt_gen, \
    rijndael_decrypt_gen

from pprp.source import \
    file_source_gen, \
    data_source_gen

from pprp.sink import \
    decrypt_sink, \
    encrypt_sink, \
    decrypt_to_file_sink, \
    encrypt_to_file_sink

from pprp.pbkdf2 import pbkdf2

import pprp.crypto
pprp.adapters.rijndael_cls = pprp.crypto.rijndael

from pprp.utility import trim_pkcs7_padding

# Backwards-compatibility shims
rjindael_encrypt_gen = rijndael_encrypt_gen
rjindael_decrypt_gen = rijndael_decrypt_gen
