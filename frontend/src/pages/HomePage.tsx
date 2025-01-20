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
import { Wallet, WalletSigner, WalletStorageManager, StorageClient } from 'wallet-storage-client';
import { KeyDeriver, PrivateKey } from '@bsv/sdk'

function HomePage() {
    const { wallet, setWallet } = useWallet();
    const [privKeyInput, setPrivKeyInput] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (privKeyInput.trim().length > 0) {
            localStorage.setItem('brc100privkey', privKeyInput.trim());
            const keyDeriver = new KeyDeriver(PrivateKey.fromHex(privKeyInput.trim()));
            const storageManager = new WalletStorageManager(keyDeriver.identityKey);
            const signer = new WalletSigner('test', keyDeriver, storageManager);
            const wallet = new Wallet(signer, keyDeriver);
            const client = new StorageClient(wallet, 'https://staging-dojo.babbage.systems');
            await storageManager.addWalletStorageProvider(client);
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
        </Box>
    );
}

export default HomePage;
