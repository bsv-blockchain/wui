import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    Paper
} from '@mui/material';
import { useWallet, MockBRC100Wallet } from '../contexts/WalletContext';

function HomePage() {
    const { wallet, setWallet } = useWallet();
    const [privKeyInput, setPrivKeyInput] = useState('');
    const navigate = useNavigate();

    const handleSubmit = () => {
        if (privKeyInput.trim().length > 0) {
            localStorage.setItem('brc100privkey', privKeyInput.trim());
            const w = new MockBRC100Wallet(privKeyInput.trim());
            setWallet(w);
            navigate('/actions'); // go to actions page
        }
    };

    // If already have a wallet, skip to /actions
    if (wallet) {
        navigate('/actions');
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Paper sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom>
                    Enter Private Key
                </Typography>
                <TextField
                    label="Private Key"
                    fullWidth
                    margin="normal"
                    value={privKeyInput}
                    onChange={(e) => setPrivKeyInput(e.target.value)}
                />
                <Box sx={{ textAlign: 'right', mt: 2 }}>
                    <Button variant="contained" onClick={handleSubmit}>
                        Save & Continue
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default HomePage;
