import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import makeWallet from '../utils/makeWallet';

function HomePage() {
    const { wallet, setWallet } = useWallet();
    const [privKeyInput, setPrivKeyInput] = useState('');
    const [storageInput, setStorageInput] = useState('https://staging-dojo.babbage.systems');
    const [networkInput, setNetworkInput] = useState('test');
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (privKeyInput.trim().length > 0) {
            localStorage.setItem('brc100privkey', privKeyInput.trim());
            localStorage.setItem('brc100storage', storageInput.trim());
            localStorage.setItem('brc100network', networkInput.trim());
            const wallet = await makeWallet(networkInput as 'test' | 'main', privKeyInput, storageInput);
            setWallet(wallet);
            navigate('/actions');
        }
    };

    if (wallet) {
        navigate('/actions');
    }

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
            sx={{ px: 2 }}
        >
            <Paper sx={{ p: 4, width: '100%', maxWidth: 500 }}>
                <Typography variant="h5" gutterBottom>
                    Network
                </Typography>
                <TextField
                    label="Network"
                    fullWidth
                    margin="normal"
                    value={networkInput}
                    onChange={(e) => setNetworkInput(e.target.value)}
                />
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
                <Typography variant="h5" gutterBottom>
                    Enter Storage URL
                </Typography>
                <TextField
                    label="Storage URL"
                    fullWidth
                    margin="normal"
                    value={storageInput}
                    onChange={(e) => setStorageInput(e.target.value)}
                />
                <Box sx={{ textAlign: 'right', mt: 2 }}>
                    <Button variant="contained" onClick={handleSubmit}>
                        Save & Continue
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default HomePage;
