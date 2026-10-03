import urllib.request
import json

def test_api():
    base_url = "http://127.0.0.1:8001/api"
    # Login
    login_data = json.dumps({"email": "admin@goldenswan.com", "password": "Admin@12345"}).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/auth/login/", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as res:
        token = json.loads(res.read().decode("utf-8"))["data"]["tokens"]["access_token"]

    # Room types
    req_t = urllib.request.Request(f"{base_url}/room-types/", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req_t) as res:
        types = json.loads(res.read().decode("utf-8"))["data"]

    print("=" * 60)
    print("  PAMMAL HOTEL ROOM TYPES")
    print("=" * 60)
    for t in types:
        print(f"  * {t['name']}: Rs. {t['base_price']} | Max Occupancy: {t['max_occupancy']} Person(s)")

    # Rooms
    req_r = urllib.request.Request(f"{base_url}/rooms/", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req_r) as res:
        rooms = json.loads(res.read().decode("utf-8"))["data"]

    print("\n" + "=" * 60)
    print(f"  PAMMAL HOTEL ACTIVE ROOMS ({len(rooms)} ROOMS CONFIGURED)")
    print("=" * 60)
    for r in rooms:
        type_label = r.get("room_type_name") or r.get("description")
        print(f"  Room #{r['room_number']} (Floor {r['floor']}) | {type_label} | Tariff: Rs. {r['price']} | Capacity: {r['capacity']} | Status: {r['status']}")

if __name__ == "__main__":
    test_api()
