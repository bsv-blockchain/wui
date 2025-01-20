import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Stack,
    TextField,
    Button
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

function UtilitiesPage() {
    const { wallet } = useWallet();

    const [authStatus, setAuthStatus] = useState('');
    const [heightResult, setHeightResult] = useState('');
    const [headerHeight, setHeaderHeight] = useState('');
    const [headerResult, setHeaderResult] = useState('');
    const [networkResult, setNetworkResult] = useState('');
    const [versionResult, setVersionResult] = useState('');

    const handleCheckAuth = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.isAuthenticated({});
            setAuthStatus(resp.authenticated ? 'Authenticated' : 'Not Authenticated');
        } catch (err) {
            console.error(err);
        }
    };

    const handleWaitAuth = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.waitForAuthentication({});
            setAuthStatus(resp.authenticated ? 'Authenticated' : 'Not Authenticated');
        } catch (err) {
            console.error(err);
        }
    };

    const handleGetHeight = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.getHeight({});
            setHeightResult(String(resp.height));
        } catch (err) {
            console.error(err);
        }
    };

    const handleGetHeaderForHeight = async () => {
        if (!wallet) return;
        try {
            const h = parseInt(headerHeight, 10);
            const resp = await wallet.getHeaderForHeight({ height: h });
            setHeaderResult(resp.header);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGetNetwork = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.getNetwork({});
            setNetworkResult(resp.network);
        } catch (err) {
            console.error(err);
        }
    };

    const handleGetVersion = async () => {
        if (!wallet) return;
        try {
            const resp = await wallet.getVersion({});
            setVersionResult(resp.version);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Utilities</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2}>
                    <Button variant="contained" onClick={handleCheckAuth}>
                        isAuthenticated
                    </Button>
                    <Button variant="contained" onClick={handleWaitAuth}>
                        waitForAuthentication
                    </Button>
                    <Typography>{authStatus}</Typography>
                </Stack>
            </Paper>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2}>
                    <Button variant="contained" onClick={handleGetHeight}>
                        getHeight
                    </Button>
                    <Typography>Result: {heightResult}</Typography>
                </Stack>
            </Paper>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        label="Block Height"
                        value={headerHeight}
                        onChange={(e) => setHeaderHeight(e.target.value)}
                        sx={{ width: 140 }}
                    />
                    <Button variant="contained" onClick={handleGetHeaderForHeight}>
                        getHeaderForHeight
                    </Button>
                </Stack>
                <Typography>Result: {headerResult}</Typography>
            </Paper>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Button variant="contained" onClick={handleGetNetwork}>
                    getNetwork
                </Button>
                <Typography>Result: {networkResult}</Typography>
            </Paper>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Button variant="contained" onClick={handleGetVersion}>
                    getVersion
                </Button>
                <Typography>Result: {versionResult}</Typography>
            </Paper>
        </Box>
    );
}

export default UtilitiesPage;
