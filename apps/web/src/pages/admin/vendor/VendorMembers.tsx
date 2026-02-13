import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../utils/api';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

interface Member {
    member_id: string;
    name: string;
    phone_e164: string;
    last_active_at: string;
    active_card: {
        stamps_count: number;
    } | null;
    status: 'ACTIVE' | 'SUSPENDED';
}

const VendorMembers: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { token } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const initialMemberNameRef = React.useRef<string>('');

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const query = search ? `?search=${encodeURIComponent(search)}` : '';
            const res = await api.get(`/api/v1/v/${slug}/admin/members${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMembers(res.data);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchMembers();
    }, [slug, search, token]);

    const handleEditClick = (member: Member) => {
        setSelectedMember(member);
        initialMemberNameRef.current = member.name;
        setIsEditModalOpen(true);
    };

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember) return;

        try {
            await api.put(`/api/v1/v/${slug}/admin/members/${selectedMember.member_id}`,
                { name: selectedMember.name },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            initialMemberNameRef.current = selectedMember.name;
            setIsEditModalOpen(false);
            fetchMembers();
        } catch (error) {
            console.error('Error updating member:', error);
        }
    };

    // Check if member form is dirty
    const isMemberDirty = selectedMember ? selectedMember.name !== initialMemberNameRef.current : false;

    // Block navigation if modal is open with unsaved changes
    useUnsavedChanges({ 
        isDirty: Boolean(isEditModalOpen && isMemberDirty), 
        message: 'You have unsaved member changes in the form. Are you sure you want to leave?' 
    });

    const handleSuspend = async () => {
        if (!selectedMember) return;
        if (!confirm(`Are you sure you want to ${selectedMember.status === 'SUSPENDED' ? 'reactivate' : 'suspend'} this member?`)) return;

        try {
            await api.post(`/api/v1/v/${slug}/admin/members/${selectedMember.member_id}/suspend`,
                { suspend: selectedMember.status !== 'SUSPENDED' },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setIsEditModalOpen(false);
            fetchMembers();
        } catch (error) {
            console.error('Error suspending member:', error);
        }
    };

    return (
        <div className="members-page fade-in">
            {/* Header Section */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Members</h1>
                    <p className="page-subtitle">View and manage your loyal customers.</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="glass-input"
                        style={{ width: '300px', paddingLeft: '2.5rem' }}
                    />
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                        🔍
                    </span>
                </div>
            </div>

            {/* Members Table */}
            <div className="glass-panel premium-table-container">
                <table className="premium-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Current Stamps</th>
                            <th>Last Active</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-8 text-muted">Loading members...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-muted">No members found matching your search.</td></tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.member_id}>
                                    <td className="font-medium text-white">{member.name}</td>
                                    <td className="text-muted font-mono text-sm">{member.phone_e164}</td>
                                    <td>
                                        {member.active_card ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-gray-700 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-primary h-full"
                                                        style={{ width: `${(member.active_card.stamps_count / 10) * 100}%` }} // Assuming 10 is max for visual
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-bold text-primary">{member.active_card.stamps_count}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted text-xs italic">No Active Card</span>
                                        )}
                                    </td>
                                    <td className="text-sm text-dim">
                                        {new Date(member.last_active_at).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </td>
                                    <td>
                                        <span className={`badge ${member.status === 'SUSPENDED' ? 'badge-danger' : 'badge-success'}`}>
                                            {member.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleEditClick(member)}
                                            className="text-sm text-accent hover:text-white transition font-medium"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && selectedMember && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg p-8 transform transition-all scale-100">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-white">Edit Member</h2>
                            <button 
                                onClick={() => {
                                    if (isMemberDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                                        return;
                                    }
                                    setIsEditModalOpen(false);
                                }} 
                                className="text-muted hover:text-white text-xl">&times;</button>
                        </div>

                        <form onSubmit={handleSaveMember}>
                            <div className="mb-6">
                                <label className="input-label">Name</label>
                                <input
                                    type="text"
                                    value={selectedMember.name}
                                    onChange={(e) => setSelectedMember({ ...selectedMember, name: e.target.value })}
                                    className="glass-input"
                                    required
                                />
                            </div>
                            <div className="mb-8">
                                <label className="input-label">Phone Number</label>
                                <input
                                    type="text"
                                    value={selectedMember.phone_e164}
                                    disabled
                                    className="glass-input opacity-60"
                                />
                                <p className="text-xs text-dim mt-2">Phone numbers cannot be changed as they are unique identifiers.</p>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-glass">
                                <button
                                    type="button"
                                    onClick={handleSuspend}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedMember.status === 'SUSPENDED'
                                            ? 'text-green-400 hover:bg-green-400/10'
                                            : 'text-red-400 hover:bg-red-400/10'
                                        }`}
                                >
                                    {selectedMember.status === 'SUSPENDED' ? 'Reactivate Access' : 'Suspend Access'}
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isMemberDirty && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                                                return;
                                            }
                                            setIsEditModalOpen(false);
                                        }}
                                        className="btn-ghost"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-premium"
                                        disabled={!isMemberDirty}
                                        style={{ opacity: !isMemberDirty ? 0.5 : 1, cursor: !isMemberDirty ? 'not-allowed' : 'pointer' }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorMembers;
