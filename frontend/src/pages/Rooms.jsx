import React, { useState, useEffect } from 'react';
import {
  BedDouble,
  Plus,
  Filter,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Users,
  Eye,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { roomService } from '../services/roomService';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency } from '../utils/formatters';
import { EmptyState } from '../components/EmptyState';
import { CardSkeleton } from '../components/Skeleton';

export const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [statusUpdateRoom, setStatusUpdateRoom] = useState(null);

  // Form states
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newFloor, setNewFloor] = useState(1);
  const [newPrice, setNewPrice] = useState('');
  const [newCapacity, setNewCapacity] = useState(2);
  const [newTypeId, setNewTypeId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRoomsData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedFloor !== 'ALL') params.floor = selectedFloor;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const [roomsRes, typesRes, countsRes] = await Promise.all([
        roomService.getRooms(params),
        roomService.getRoomTypes(),
        roomService.getStatusCounts(),
      ]);

      if (roomsRes.success) setRooms(roomsRes.data);
      if (typesRes.success) setRoomTypes(typesRes.data);
      if (countsRes.success) setCounts(countsRes.data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomsData();
  }, [selectedFloor, selectedStatus]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await roomService.createRoom({
        room_number: newRoomNumber,
        floor: Number(newFloor),
        price: Number(newPrice),
        capacity: Number(newCapacity),
        room_type_id: newTypeId || undefined,
        description: newDesc,
        status: 'AVAILABLE',
      });

      if (res.success) {
        setShowAddModal(false);
        setNewRoomNumber('');
        setNewPrice('');
        setNewDesc('');
        fetchRoomsData();
      } else {
        setFormError(res.message || 'Failed to create room.');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error creating room.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!statusUpdateRoom) return;
    try {
      const res = await roomService.updateRoomStatus(statusUpdateRoom._id || statusUpdateRoom.id, newStatus);
      if (res.success) {
        setStatusUpdateRoom(null);
        fetchRoomsData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-gold-400" />
            <span>Room Operations & Telemetry</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time visual floor grid and room status tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-slate-950 font-bold rounded-xl shadow-md shadow-gold-500/10 text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Room</span>
        </button>
      </div>

      {/* Status Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'All Rooms', val: counts.total || 0, color: 'text-slate-200 border-slate-800' },
          { label: 'Available', val: counts.AVAILABLE || 0, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
          { label: 'Occupied', val: counts.OCCUPIED || 0, color: 'text-rose-400 border-rose-500/30 bg-rose-500/5' },
          { label: 'Reserved', val: counts.RESERVED || 0, color: 'text-blue-400 border-blue-500/30 bg-blue-500/5' },
          { label: 'Cleaning', val: counts.CLEANING || 0, color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
          { label: 'Maintenance', val: counts.MAINTENANCE || 0, color: 'text-slate-400 border-slate-700 bg-slate-800/40' },
        ].map((c, i) => (
          <div key={i} className={`p-3 rounded-xl border bg-slate-900/60 ${c.color} text-center`}>
            <div className="text-xl font-bold">{c.val}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Floor:</span>
          {['ALL', 1, 2, 3].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFloor(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFloor === f
                  ? 'bg-gold-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All Floors' : `Floor ${f}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
          {['ALL', 'AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === st
                  ? 'bg-slate-200 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No rooms match the criteria"
          description="Try changing the floor or status filter above."
          actionLabel="Reset Filters"
          onAction={() => {
            setSelectedFloor('ALL');
            setSelectedStatus('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isAvailable = room.status === 'AVAILABLE';
            const isOccupied = room.status === 'OCCUPIED';
            const isReserved = room.status === 'RESERVED';
            const isCleaning = room.status === 'CLEANING';

            return (
              <div
                key={room.id || room._id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm relative group overflow-hidden"
              >
                {/* Accent line based on status */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 ${
                    isAvailable
                      ? 'bg-emerald-500'
                      : isOccupied
                      ? 'bg-rose-500'
                      : isReserved
                      ? 'bg-blue-500'
                      : isCleaning
                      ? 'bg-amber-500'
                      : 'bg-slate-600'
                  }`}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-extrabold text-slate-100 tracking-tight">
                        #{room.room_number}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                        Floor {room.floor}
                      </span>
                    </div>
                    <StatusBadge status={room.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-bold text-amber-300 tracking-wide">
                      {room.room_type_name || room.description || 'Pammal Hotel Room'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mb-3 line-clamp-1">
                    {room.description || 'Pammal Hotel guest accommodation.'}
                  </div>

                  <div className="flex items-center justify-between py-2 border-y border-slate-800/60 mb-3 text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Capacity: {room.capacity}
                    </span>
                    <span className="font-bold text-gold-400 text-sm">
                      {formatCurrency(room.price)} <span className="text-[10px] text-slate-500 font-normal">/ night</span>
                    </span>
                  </div>

                  {/* Amenities Tags */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {room.amenities.slice(0, 3).map((a, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {a}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setStatusUpdateRoom(room)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gold-400" />
                    <span>Change Status</span>
                  </button>
                  <button
                    onClick={() => setSelectedRoom(room)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    title="View Room Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-100 mb-1">Create New Room</h3>
            <p className="text-xs text-slate-400 mb-4">Add a new room unit to GoldenSwan inventory.</p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 104"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Floor *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newFloor}
                    onChange={(e) => setNewFloor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nightly Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    placeholder="3500.00"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Guest Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Room Category / Type</label>
                <select
                  value={newTypeId}
                  onChange={(e) => setNewTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                >
                  <option value="">Select Room Type (Optional)</option>
                  {roomTypes.map((t) => (
                    <option key={t.id || t._id} value={t.id || t._id}>
                      {t.name} (Base: {formatCurrency(t.base_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Balcony view, king-size bed, complimentary breakfast..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-gold-500/10"
                >
                  {submitting ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusUpdateRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Update Room #{statusUpdateRoom.room_number} Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Current state: <strong className="text-gold-400">{statusUpdateRoom.status}</strong>
            </p>

            <div className="space-y-2">
              {[
                { st: 'AVAILABLE', label: 'Mark as Available', desc: 'Ready for guest check-in', color: 'hover:border-emerald-500/50' },
                { st: 'CLEANING', label: 'Mark as Cleaning', desc: 'Housekeeping in progress', color: 'hover:border-amber-500/50' },
                { st: 'MAINTENANCE', label: 'Mark for Maintenance', desc: 'Repair or technical inspection', color: 'hover:border-slate-500/50' },
                { st: 'OCCUPIED', label: 'Mark as Occupied', desc: 'Guest residing in room', color: 'hover:border-rose-500/50' },
                { st: 'RESERVED', label: 'Mark as Reserved', desc: 'Reserved for upcoming booking', color: 'hover:border-blue-500/50' },
              ].map((item) => (
                <button
                  key={item.st}
                  onClick={() => handleUpdateStatus(item.st)}
                  className={`w-full p-3 text-left rounded-xl bg-slate-950/70 border border-slate-800 ${item.color} transition-all flex items-center justify-between`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                  </div>
                  <StatusBadge status={item.st} size="sm" />
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setStatusUpdateRoom(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Details View Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Room #{selectedRoom.room_number}</h3>
                <p className="text-xs text-slate-400">Floor {selectedRoom.floor}</p>
              </div>
              <StatusBadge status={selectedRoom.status} />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Nightly Rate</span>
                <span className="font-bold text-gold-400 text-sm">{formatCurrency(selectedRoom.price)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Max Guests</span>
                <span className="font-semibold text-slate-200">{selectedRoom.capacity} People</span>
              </div>
              <div className="py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 block mb-1">Description</span>
                <span className="text-slate-200">{selectedRoom.description || 'Standard luxury room.'}</span>
              </div>
              {selectedRoom.amenities && (
                <div className="py-1.5">
                  <span className="text-slate-400 block mb-1.5">Amenities Included</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoom.amenities.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
