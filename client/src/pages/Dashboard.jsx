import { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, Send, RefreshCw } from 'lucide-react';

const Dashboard = ({ user }) => {
    const [balance, setBalance] = useState(null);
    const [receiverEmail, setReceiverEmail] = useState('');
    const [amount, setAmount] = useState('');
    const [transferError, setTransferError] = useState('');
    const [transferSuccess, setTransferSuccess] = useState('');
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [loadingTransfer, setLoadingTransfer] = useState(false);

    const fetchBalance = async () => {
        setLoadingBalance(true);
        try {
            const res = await axios.get('/api/balance');
            setBalance(res.data.balance);
        } catch (err) {
            console.error('Error fetching balance', err);
        } finally {
            setLoadingBalance(false);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setTransferError('');
        setTransferSuccess('');
        setLoadingTransfer(true);

        try {
            const res = await axios.post('/api/transfer', {
                receiverEmail,
                amount
            });
            setTransferSuccess(res.data.message);
            setBalance(res.data.newBalance);
            setReceiverEmail('');
            setAmount('');
        } catch (err) {
            setTransferError(err.response?.data?.message || 'Transfer failed');
        } finally {
            setLoadingTransfer(false);
        }
    };

    return (
        <div className="dashboard-container">
            <div className="welcome-section">
                <h1>Welcome, {user.name}!</h1>
                <p style={{ color: 'var(--text-light)' }}>Securely manage your finances</p>
            </div>

            <div className="grid">
                {/* Balance Card */}
                <div className="card balance-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Wallet color="var(--primary)" size={24} />
                        <h3 style={{ color: 'var(--secondary)' }}>Current Balance</h3>
                    </div>
                    <div className="balance-amount">
                        {balance !== null ? `₹${balance.toLocaleString()}` : '----'}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.5rem' }}>
                        Minimum balance of ₹2,000 required
                    </p>
                    <button
                        onClick={fetchBalance}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        disabled={loadingBalance}
                    >
                        {loadingBalance ? <RefreshCw className="spin" size={18} /> : 'Check Balance'}
                    </button>
                </div>

                {/* Transfer Card */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Send color="var(--primary)" size={24} />
                        <h3>Money Transfer</h3>
                    </div>

                    {transferError && <div className="alert alert-error">{transferError}</div>}
                    {transferSuccess && <div className="alert alert-success">{transferSuccess}</div>}

                    <form onSubmit={handleTransfer} className="transfer-form">
                        <div className="form-group">
                            <label>Receiver Email</label>
                            <input
                                type="text"
                                value={receiverEmail}
                                onChange={(e) => setReceiverEmail(e.target.value)}
                                placeholder="maya@example.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Amount (₹)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loadingTransfer}>
                            {loadingTransfer ? 'Processing...' : 'Transfer Now'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
