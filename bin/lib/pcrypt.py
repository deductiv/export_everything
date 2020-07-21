"""
Pure-python implementations of the SHA2-based variants of crypt(3).

Pretty close to direct translation from the glibc crypt(3) source, pardon
the c-isms.

Spec can be seen in SHA-crypt.txt, originally sourced from
https://www.akkadia.org/drepper/SHA-crypt.txt
"""

from __future__ import division, print_function

from collections import namedtuple as _namedtuple
from random import SystemRandom as _SystemRandom
import argparse
import getpass
import hashlib
import re
import sys

_BASE64_CHARACTERS = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
_SALT_RE = re.compile(r'\$(?P<algo>\d)\$(?:rounds=(?P<rounds>\d+)\$)?(?P<salt>.{1,16})')
_ROUNDS_DEFAULT = 5000 # As used by crypt(3)
_PY2 = sys.version_info < (3, 0, 0)
_sr = _SystemRandom()


class _Method(_namedtuple('_Method', 'name ident salt_chars total_size')):
    """Class representing a salt method per the Modular Crypt Format or the
    legacy 2-character crypt method."""

    def __repr__(self):
        return '<crypt.METHOD_{0}>'.format(self.name)


#  available salting/crypto methods
METHOD_SHA256 = _Method('SHA256', '5', 16, 63)
METHOD_SHA512 = _Method('SHA512', '6', 16, 106)

methods = (
    METHOD_SHA512,
    METHOD_SHA256,
)


def mksalt(method=None, rounds=None):
    """Generate a salt for the specified method.
    If not specified, the strongest available method will be used.
    """
    if method is None:
        method = methods[0]
    salt = ['${0}$'.format(method.ident) if method.ident else '']
    if rounds:
        salt.append('rounds={0:d}$'.format(rounds))
    salt.append(''.join(_sr.choice(_BASE64_CHARACTERS) for char in range(method.salt_chars)))
    return ''.join(salt)


def crypt(word, salt=None, rounds=_ROUNDS_DEFAULT):
    """Return a string representing the one-way hash of a password, with a salt
    prepended.
    If ``salt`` is not specified or is ``None``, the strongest
    available method will be selected and a salt generated.  Otherwise,
    ``salt`` may be one of the ``crypt.METHOD_*`` values, or a string as
    returned by ``crypt.mksalt()``.
    """
    if salt is None or isinstance(salt, _Method):
        salt = mksalt(salt, rounds)

    algo, rounds, salt = extract_components_from_salt(salt)
    if algo == 5:
        hashfunc = hashlib.sha256
    elif algo == 6:
        hashfunc = hashlib.sha512
    else:
        raise ValueError('Unsupported algorithm, must be either 5 (sha256) or 6 (sha512)')

    return sha2_crypt(word, salt, hashfunc, rounds)


def sha2_crypt(key, salt, hashfunc, rounds=_ROUNDS_DEFAULT):
    """
    This algorithm is insane. History can be found at
    https://en.wikipedia.org/wiki/Crypt_%28C%29
    """
    key = key.encode('utf-8')
    h = hashfunc()
    alt_h = hashfunc()
    digest_size = h.digest_size
    key_len = len(key)

    # First, feed key, salt and then key again to the alt hash
    alt_h.update(key)
    alt_h.update(salt.encode('utf-8'))
    alt_h.update(key)
    alt_result = alt_h.digest()

    # Feed key and salt to the primary hash
    h.update(key)
    h.update(salt.encode('utf-8'))

    # Feed as many (loopping) bytes from alt digest as the length of the key
    for i in range(key_len//digest_size):
        h.update(alt_result)
    h.update(alt_result[:(key_len % digest_size)])

    # Take the binary representation of the length of the key and for every
    # 1 add the alternate digest, for every 0 the key
    bits = key_len
    while bits > 0:
        if bits & 1 == 0:
            h.update(key)
        else:
            h.update(alt_result)
        bits >>= 1

    # Store the results from the primary hash
    alt_result = h.digest()

    h = hashfunc()

    # Add password for each character in the password
    for i in range(key_len):
        h.update(key)

    temp_result = h.digest()

    # Compute a P array of the bytes in temp repeated for the length of the key
    p_bytes = temp_result * (key_len // digest_size)
    p_bytes += temp_result[:(key_len % digest_size)]

    alt_h = hashfunc()

    # Add the salt 16 + arbitrary amount decided by first byte in alt digest
    for i in range(16 + byte2int(alt_result[0])):
        alt_h.update(salt.encode('utf-8'))

    temp_result = alt_h.digest()

    # Compute a S array of the bytes in temp_result repeated for the length
    # of the salt
    s_bytes = temp_result * (len(salt) // digest_size)
    s_bytes += temp_result[:(len(salt) % digest_size)]

    # Do the actual iterations
    for i in range(rounds):
        h = hashfunc()

        # Alternate adding either the P array or the alt digest
        if i & 1 != 0:
            h.update(p_bytes)
        else:
            h.update(alt_result)

        # If the round is divisible by 3, add the S array
        if i % 3 != 0:
            h.update(s_bytes)

        # If the round is divisible by 7, add the P array
        if i % 7 != 0:
            h.update(p_bytes)

        # Alternate adding either the P array or the alt digest, opposite
        # of first step
        if i & 1 != 0:
            h.update(alt_result)
        else:
            h.update(p_bytes)

        alt_result = h.digest()

    # Compute the base64-ish representation of the hash
    ret = []
    if digest_size == 64:
        # SHA-512
        ret.append(b64_from_24bit(alt_result[0], alt_result[21], alt_result[42], 4))
        ret.append(b64_from_24bit(alt_result[22], alt_result[43], alt_result[1], 4))
        ret.append(b64_from_24bit(alt_result[44], alt_result[2], alt_result[23], 4))
        ret.append(b64_from_24bit(alt_result[3], alt_result[24], alt_result[45], 4))
        ret.append(b64_from_24bit(alt_result[25], alt_result[46], alt_result[4], 4))
        ret.append(b64_from_24bit(alt_result[47], alt_result[5], alt_result[26], 4))
        ret.append(b64_from_24bit(alt_result[6], alt_result[27], alt_result[48], 4))
        ret.append(b64_from_24bit(alt_result[28], alt_result[49], alt_result[7], 4))
        ret.append(b64_from_24bit(alt_result[50], alt_result[8], alt_result[29], 4))
        ret.append(b64_from_24bit(alt_result[9], alt_result[30], alt_result[51], 4))
        ret.append(b64_from_24bit(alt_result[31], alt_result[52], alt_result[10], 4))
        ret.append(b64_from_24bit(alt_result[53], alt_result[11], alt_result[32], 4))
        ret.append(b64_from_24bit(alt_result[12], alt_result[33], alt_result[54], 4))
        ret.append(b64_from_24bit(alt_result[34], alt_result[55], alt_result[13], 4))
        ret.append(b64_from_24bit(alt_result[56], alt_result[14], alt_result[35], 4))
        ret.append(b64_from_24bit(alt_result[15], alt_result[36], alt_result[57], 4))
        ret.append(b64_from_24bit(alt_result[37], alt_result[58], alt_result[16], 4))
        ret.append(b64_from_24bit(alt_result[59], alt_result[17], alt_result[38], 4))
        ret.append(b64_from_24bit(alt_result[18], alt_result[39], alt_result[60], 4))
        ret.append(b64_from_24bit(alt_result[40], alt_result[61], alt_result[19], 4))
        ret.append(b64_from_24bit(alt_result[62], alt_result[20], alt_result[41], 4))
        ret.append(b64_from_24bit(int2byte(0), int2byte(0), alt_result[63], 2))
    else:
        # SHA-256
        ret.append(b64_from_24bit(alt_result[0], alt_result[10], alt_result[20], 4))
        ret.append(b64_from_24bit(alt_result[21], alt_result[1], alt_result[11], 4))
        ret.append(b64_from_24bit(alt_result[12], alt_result[22], alt_result[2], 4))
        ret.append(b64_from_24bit(alt_result[3], alt_result[13], alt_result[23], 4))
        ret.append(b64_from_24bit(alt_result[24], alt_result[4], alt_result[14], 4))
        ret.append(b64_from_24bit(alt_result[15], alt_result[25], alt_result[5], 4))
        ret.append(b64_from_24bit(alt_result[6], alt_result[16], alt_result[26], 4))
        ret.append(b64_from_24bit(alt_result[27], alt_result[7], alt_result[17], 4))
        ret.append(b64_from_24bit(alt_result[18], alt_result[28], alt_result[8], 4))
        ret.append(b64_from_24bit(alt_result[9], alt_result[19], alt_result[29], 4))
        ret.append(b64_from_24bit(int2byte(0), alt_result[31], alt_result[30], 3))

    algo = 6 if digest_size == 64 else 5
    if rounds == _ROUNDS_DEFAULT:
        return '${0}${1}${2}'.format(algo, salt, ''.join(ret))
    else:
        return '${0}$rounds={1}${2}${3}'.format(algo, rounds, salt, ''.join(ret))


def byte2int(value):
    if _PY2:
        return ord(value)
    else:
        return value


def int2byte(value):
    if _PY2:
        return chr(value)
    else:
        return value


def extract_components_from_salt(salt):
    salt_match = _SALT_RE.match(salt)
    if salt_match:
        algo, rounds, salt = salt_match.groups(_ROUNDS_DEFAULT)
        algo = int(algo)
        rounds = int(rounds)
    else:
        algo = 6
        rounds = _ROUNDS_DEFAULT
    return _namedtuple('Salt', 'algo rounds salt')(algo, rounds, salt)


def b64_from_24bit(b2, b1, b0, n):
    b2 = byte2int(b2)
    b1 = byte2int(b1)
    b0 = byte2int(b0)
    index = b2 << 16 | b1 << 8 | b0
    ret = []
    for i in range(n):
        ret.append(_BASE64_CHARACTERS[index & 0x3f])
        index >>= 6
    return ''.join(ret)


def cli(argv=None):
    parser = argparse.ArgumentParser(description='Compute a password hash for '
        'SHA256/SHA512 in crypt(3)-compatible format. Password will be prompted for.')
    parser.add_argument('-r', '--rounds', default=_ROUNDS_DEFAULT, type=int,
        help='How many rounds of hashing to perform. More rounds are slower, making'
        ' it harder to reverse a hash through brute force. Default: %(default)s')
    parser.add_argument('-a', '--algo', choices=('sha256', 'sha512'), default='sha512',
        help='Which algorithm to use. Default: %(default)s')
    parser.add_argument('-s', '--single-prompt', action='store_true',
        help="Don't ask to repeat the password")

    args = parser.parse_args(argv)

    if not 1000 < args.rounds < 999999999:
        # limits fetched from crypt(3) source
        sys.stderr.write('Rounds must be between 1000 and 999999999.\n')
        sys.exit(1)

    if sys.stdin.isatty():
        if args.single_prompt:
            password = getpass.getpass('Enter password: ')
        else:
            password = double_prompt_for_plaintext_password()
    else:
        password = sys.stdin.readline().rstrip('\n')
    method = METHOD_SHA256 if args.algo == 'sha256' else METHOD_SHA512
    print(crypt(password, method, rounds=args.rounds), end='\n' if sys.stdout.isatty() else '')


def double_prompt_for_plaintext_password():
    """Get the desired password from the user through a double prompt."""
    password = 1
    password_repeat = 2
    while password != password_repeat:
        password = getpass.getpass('Enter password: ')
        password_repeat = getpass.getpass('Repeat password: ')
        if password != password_repeat:
            sys.stderr.write('Passwords do not match, try again.\n')
    return password

