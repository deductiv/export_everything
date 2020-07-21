import sys, os 
f = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'py2_darwin_x86_64')
g = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')
h = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib', 'splunklib')
sys.path.append(f)
sys.path.append(g)
sys.path.append(h)
import pcrypt
import six 
from splunksecrets import encrypt 

