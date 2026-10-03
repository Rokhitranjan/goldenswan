import urllib.request
import urllib.error
import json

base = 'https://goldenswan-hotel.onrender.com/api'
req_l = urllib.request.Request(f'{base}/auth/login/', data=json.dumps({'email':'admin@goldenswan.com','password':'Admin@12345'}).encode('utf-8'), headers={'Content-Type':'application/json'})
try:
    res = urllib.request.urlopen(req_l)
    print("STATUS:", res.status)
    print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print(e.read().decode('utf-8'))
