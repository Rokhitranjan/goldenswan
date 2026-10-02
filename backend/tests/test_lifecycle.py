import requests

def test_full_lifecycle():
    res = requests.post('http://127.0.0.1:8000/api/auth/login/', json={'email':'admin@goldenswan.com','password':'Admin@12345'})
    token = res.json()['data']['tokens']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # Find any available room
    rooms = requests.get('http://127.0.0.1:8000/api/rooms/', headers=headers).json()['data']
    avail_room = next(r for r in rooms if r['status'] == 'AVAILABLE')
    r_id = avail_room['id']
    room_num = avail_room['room_number']
    print(f"Testing with available Room {room_num} (ID: {r_id})")

    # Create customer
    cust = requests.post('http://127.0.0.1:8000/api/customers/', json={'full_name':'E2E Test Guest','phone':'+91 9111122222'}, headers=headers).json()['data']
    print(f"Guest registered: {cust['name']}")

    # Case 1: Reservation -> RESERVED
    book_res = requests.post('http://127.0.0.1:8000/api/bookings/', json={
        'room_id': r_id,
        'customer_id': cust['id'],
        'check_in': '2026-11-01T12:00:00Z',
        'check_out': '2026-11-03T11:00:00Z',
        'guests': 2,
        'room_rate': 2500,
        'amount_paid': 2500,
        'payment_mode': 'UPI'
    }, headers=headers).json()
    assert book_res['success'] is True, f"Booking creation failed: {book_res}"
    b_id = book_res['data']['id']
    print(f"Case 1 Pass: Booking created with ID {book_res['data']['booking_id']}")

    # Verify Room status is RESERVED
    r_stat = requests.get(f'http://127.0.0.1:8000/api/rooms/{r_id}/', headers=headers).json()['data']['status']
    assert r_stat == 'RESERVED', f"Expected RESERVED, got {r_stat}"
    print(f"Case 1 Pass: Room 106 status is {r_stat}")

    # Case 2: Check-in -> OCCUPIED
    checkin_res = requests.post('http://127.0.0.1:8000/api/check-in/', json={'booking_id': b_id}, headers=headers).json()
    assert checkin_res['success'] is True, f"Check-in failed: {checkin_res}"
    r_stat = requests.get(f'http://127.0.0.1:8000/api/rooms/{r_id}/', headers=headers).json()['data']['status']
    assert r_stat == 'OCCUPIED', f"Expected OCCUPIED, got {r_stat}"
    print(f"Case 2 Pass: Check-in successful, Room 106 is {r_stat}")

    # Case 3: Check-out -> CLEANING (settle remaining 2500 balance)
    checkout_res = requests.post('http://127.0.0.1:8000/api/check-out/', json={'booking_id': b_id, 'payment_mode': 'CASH', 'amount': 2500}, headers=headers).json()
    assert checkout_res['success'] is True, f"Check-out failed: {checkout_res}"
    r_stat = requests.get(f'http://127.0.0.1:8000/api/rooms/{r_id}/', headers=headers).json()['data']['status']
    assert r_stat == 'CLEANING', f"Expected CLEANING, got {r_stat}"
    print(f"Case 3 Pass: Check-out successful, Room 106 is {r_stat}")

    # Case 4: Cleaning completed -> AVAILABLE
    clean_res = requests.patch(f'http://127.0.0.1:8000/api/rooms/{r_id}/status/', json={'status': 'AVAILABLE'}, headers=headers).json()
    assert clean_res['success'] is True
    r_stat = requests.get(f'http://127.0.0.1:8000/api/rooms/{r_id}/', headers=headers).json()['data']['status']
    assert r_stat == 'AVAILABLE', f"Expected AVAILABLE, got {r_stat}"
    print(f"Case 4 Pass: Cleaning done, Room 106 is {r_stat}")

    # Case 5, 6, 7: Financial calculations
    # 10,000 total + 5,000 paid -> balance 5,000 -> PARTIALLY_PAID
    b_part = requests.post('http://127.0.0.1:8000/api/bookings/', json={
        'room_id': r_id,
        'customer_id': cust['id'],
        'check_in': '2026-11-10T12:00:00Z',
        'check_out': '2026-11-14T11:00:00Z',
        'guests': 1,
        'room_rate': 2500, # 4 nights * 2500 = 10000
        'amount_paid': 5000,
        'payment_mode': 'CASH'
    }, headers=headers).json()['data']
    assert float(b_part['total_amount']) == 10000.0
    assert float(b_part['amount_paid']) == 5000.0
    assert float(b_part['balance_amount']) == 5000.0
    assert b_part['payment_status'] == 'PARTIALLY_PAID'
    print("Case 5 Pass: 10,000 total + 5,000 paid -> balance 5,000 -> PARTIALLY_PAID")

    # Add 5,000 payment -> balance 0 -> PAID
    pay_res = requests.post('http://127.0.0.1:8000/api/payments/', json={
        'booking_id': b_part['id'],
        'amount': 5000,
        'payment_mode': 'UPI'
    }, headers=headers).json()['data']
    b_paid = requests.get(f"http://127.0.0.1:8000/api/bookings/{b_part['id']}/", headers=headers).json()['data']
    assert float(b_paid['amount_paid']) == 10000.0
    assert float(b_paid['balance_amount']) == 0.0
    assert b_paid['payment_status'] == 'PAID'
    print("Case 6 Pass: 10,000 total + 10,000 paid -> balance 0 -> PAID")

    # 10,000 total + 0 paid -> balance 10,000 -> PENDING
    b_pend = requests.post('http://127.0.0.1:8000/api/bookings/', json={
        'room_id': r_id,
        'customer_id': cust['id'],
        'check_in': '2026-11-20T12:00:00Z',
        'check_out': '2026-11-24T11:00:00Z',
        'guests': 1,
        'room_rate': 2500,
        'amount_paid': 0,
    }, headers=headers).json()['data']
    assert float(b_pend['amount_paid']) == 0.0
    assert float(b_pend['balance_amount']) == 10000.0
    assert b_pend['payment_status'] == 'PENDING'
    print("Case 7 Pass: 10,000 total + 0 paid -> balance 10,000 -> PENDING")

    # Case 8: Attempt to book overlapping dates on reserved room -> reject
    conflict_res = requests.post('http://127.0.0.1:8000/api/bookings/', json={
        'room_id': r_id,
        'customer_id': cust['id'],
        'check_in': '2026-11-21T12:00:00Z', # overlaps 20-24 Nov
        'check_out': '2026-11-23T11:00:00Z',
        'guests': 1,
        'room_rate': 2500,
    }, headers=headers).json()
    assert conflict_res['success'] is False
    print(f"Case 8 Pass: Overlap booking rejected: '{conflict_res['message']}'")

    # Case 9: Attempt to pay more than total -> reject
    overpay_res = requests.post('http://127.0.0.1:8000/api/payments/', json={
        'booking_id': b_pend['id'],
        'amount': 25000, # total pending is only 10,000
        'payment_mode': 'CASH'
    }, headers=headers).json()
    assert overpay_res['success'] is False
    print("Case 9 Pass: Overpayment rejected successfully")

    print("\nALL 9 CRITICAL BUSINESS CASES PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    test_full_lifecycle()
