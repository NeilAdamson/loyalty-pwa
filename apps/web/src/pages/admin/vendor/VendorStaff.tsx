import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

interface Staff {
    staff_id: string;
    name: string;
    username: string; // The login ID/Code
    role: 'ADMIN' | 'STAMPER';
    status: 'ENABLED' | 'DISABLED';
    created_at: string;
}

const VendorStaff: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { token } = useAuth();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

    // New Staff Form State
    const [newName, setNewName] = useState('');
    const [newPin, setNewPin] = useState('');
    const [newRole, setNewRole] = useState<'ADMIN' | 'STAMPER'>('STAMPER');
    const initialStaffDataRef = React.useRef<{ name: string; pin: string; role: 'ADMIN' | 'STAMPER' } | null>(null);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/v1/v/${slug}/admin/staff`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStaffList(res.data);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchStaff();
    }, [slug, token]);

    const openAddModal = () => {
        setEditingStaff(null);
        setNewName('');
        setNewPin('');
        setNewRole('STAMPER');
        initialStaffDataRef.current = null; // New form, no initial data
        setIsAddModalOpen(true);
    };

    const openEditModal = (staff: Staff) => {
        setEditingStaff(staff);
        setNewName(staff.name);
        setNewPin(''); // Keep blank to indicate no change
        setNewRole(staff.role);
        initialStaffDataRef.current = { name: staff.name, pin: '', role: staff.role };
        setIsAddModalOpen(true);
    };

    const handleSaveStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingStaff) {
                // Update existing staff
                const payload: any = { name: newName, role: newRole };
                if (newPin && newPin.length >= 4) {
                    payload.pin = newPin;
                }

                await api.put(`/api/v1/v/${slug}/admin/staff/${editingStaff.staff_id}`,
                    payload,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
            } else {
                // Create new staff
                await api.post(`/api/v1/v/${slug}/admin/staff`,
                    { name: newName, pin: newPin, role: newRole },
                    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
                );
            }

            initialStaffDataRef.current = editingStaff ? { name: newName, pin: newPin, role: newRole } : null;
            setIsAddModalOpen(false);
            setEditingStaff(null);
            setNewName('');
            setNewPin('');
            fetchStaff(); // Refresh list
        } catch (error) {
            console.error('Error saving staff:', error);
            alert('Failed to save staff.');
        }
    };

    // Check if staff form is dirty
    const isStaffDirty = editingStaff 
        ? (newName !== initialStaffDataRef.current?.name || 
           newRole !== initialStaffDataRef.current?.role || 
           (newPin.trim() !== '' && newPin !== initialStaffDataRef.current?.pin))
        : (newName.trim() !== '' || newPin.trim() !== '');

    // Block navigation if modal is open with unsaved changes
    useUnsavedChanges({ 
        isDirty: isAddModalOpen && isStaffDirty, 
        message: 'You have unsaved staff data in the form. Are you sure you want to leave?' 
    });

    const handleDisable = async (id: string, currentStatus: string) => {
        if (!confirm(`${currentStatus === 'ENABLED' ? 'Disable' : 'Enable'} this staff member?`)) return;

        try {
            // Re-using disable endpoint for now (toggle logic typically handled by specific endpoints or a status toggle)
            // If the API only has disable, we might need a separate enable or generic update. 
            // For now, let's assume the disable endpoint handles the state change or add a status update via the PUT we just made.
            // Since we added PUT, we can use that for status if needed, but the UI requested "Edit details". 
            // The existng disable endpoint was: POST /staff/:id/disable. Let's stick to that for disabling.
            // If we want to re-enable, we should use the PUT endpoint if the disable one is strict. 
            // Actually, let's use the UI's existing disable logic for now.
            await api.post(`/api/v1/v/${slug}/admin/staff/${id}/disable`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchStaff();
        } catch (error) {
            console.error('Error disabling staff:', error);
        }
    };

    return (
        <div className="staff-page fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Staff Management</h1>
                    <p className="page-subtitle">Manage access and permissions for your team.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="btn-premium"
                >
                    <span className="text-xl leading-none">+</span> Add New Staff
                </button>
            </div>

            {/* Staff Table */}
            <div className="glass-panel premium-table-container">
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username / Code</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-muted">Loading staff...</td></tr>
                        ) : staffList.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-muted">No staff members found.</td></tr>
                        ) : (
                            staffList.map((staff) => (
                                <tr key={staff.staff_id}>
                                    <td className="font-medium text-white">{staff.name}</td>
                                    <td className="font-mono text-accent text-sm bg-white/5 inline-block px-2 py-1 rounded mx-4 my-2">{staff.username}</td>
                                    <td>
                                        <span className={`badge ${staff.role === 'ADMIN' ? 'badge-purple' : 'badge-blue'}`}>
                                            {staff.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${staff.status === 'ENABLED' ? 'badge-success' : 'badge-danger'}`}>
                                            {staff.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(staff)}
                                                className="text-sm text-accent hover:text-white transition font-medium border border-blue-500/30 px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20"
                                            >
                                                Edit
                                            </button>
                                            {staff.status === 'ENABLED' && (
                                                <button
                                                    onClick={() => handleDisable(staff.staff_id, staff.status)}
                                                    className="text-sm text-red-400 hover:text-red-300 transition font-medium border border-red-500/30 px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20"
                                                >
                                                    Disable
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg p-6 transform transition-all scale-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
                                <p className="text-sm text-muted">{editingStaff ? 'Update details for this team member.' : 'Create a login for a new team member.'}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    if (isStaffDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                                        return;
                                    }
                                    setIsAddModalOpen(false);
                                }} 
                                className="text-muted hover:text-white text-xl">&times;</button>
                        </div>

                        <form onSubmit={handleSaveStaff}>
                            <div className="mb-4">
                                <label className="input-label">Full Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="glass-input"
                                    placeholder="e.g. John Doe"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="input-label">Role</label>
                                    <div className="relative">
                                        <select
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'STAMPER')}
                                            className="glass-input appearance-none cursor-pointer"
                                        >
                                            <option value="STAMPER">Stamper</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted">
                                            {/* Explicit width/height to prevent giant arrow */}
                                            <svg style={{ width: '16px', height: '16px' }} className="fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label">PIN Code {editingStaff && '(Optional)'}</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value)}
                                        className="glass-input font-mono tracking-widest text-center"
                                        minLength={4}
                                        maxLength={6}
                                        required={!editingStaff}
                                        placeholder={editingStaff ? "Unchanged" : "0000"}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
                                <p className="text-xs text-blue-200 leading-relaxed">
                                    <strong>Note:</strong> {editingStaff ? 'Updating the PIN will require the staff member to use the new code immediately.' : 'A simplified username will be generated automatically.'}
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isStaffDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                                            return;
                                        }
                                        setIsAddModalOpen(false);
                                    }}
                                    className="btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-premium"
                                    disabled={!isStaffDirty}
                                    style={{ opacity: !isStaffDirty ? 0.5 : 1, cursor: !isStaffDirty ? 'not-allowed' : 'pointer' }}
                                >
                                    {editingStaff ? 'Save Changes' : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorStaff;
