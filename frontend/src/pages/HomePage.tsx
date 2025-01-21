import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Paper,
    FormHelperText
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import makeWallet from '../utils/makeWallet';

function generateRandomPrivateKey() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) =>
        byte.toString(16).padStart(2, '0')
    ).join('');
}

const mainnetStorageOptions = [
    'https://dojo.babbage.systems',
    'https://wallet-storage2.com',
    'https://wallet-storage3.com',
];

const testnetStorageOptions = [
    'https://staging-dojo.babbage.systems',
    'https://testnet-storage2.com',
    'https://testnet-storage3.com',
];

function HomePage() {
    const navigate = useNavigate();
    const { wallet, setWallet } = useWallet();

    const [privKeyInput, setPrivKeyInput] = useState('');
    const [networkInput, setNetworkInput] = useState<'main' | 'test'>('test');
    const [storageInput, setStorageInput] = useState('');
    const [storageSelect, setStorageSelect] = useState('');
    const [isCustomUrl, setIsCustomUrl] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [privKeyError, setPrivKeyError] = useState('');
    const [storageError, setStorageError] = useState('');

    // If a wallet is already present, redirect to /actions
    useEffect(() => {
        if (wallet) {
            navigate('/actions');
        }
    }, [wallet, navigate]);

    // Update storage input field whenever the user selects from the list or chooses custom
    useEffect(() => {
        if (isCustomUrl) {
            // When custom is selected, allow user to manually type
            setStorageInput('');
        } else {
            // When not custom, set storage input to selected option
            setStorageInput(storageSelect || '');
        }
    }, [storageSelect, isCustomUrl]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNetworkChange = (event: any) => {
        const value = event.target.value as 'main' | 'test';
        setNetworkInput(value);
        // Reset storage selection and custom
        setStorageSelect('');
        setStorageInput('');
        setIsCustomUrl(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStorageSelectChange = (event: any) => {
        const value = event.target.value as string;
        if (value === 'custom') {
            setIsCustomUrl(true);
        } else {
            setIsCustomUrl(false);
            setStorageSelect(value);
        }
    };

    const handleGeneratePrivKey = () => {
        setPrivKeyInput(generateRandomPrivateKey());
    };

    const validatePrivateKey = (key: string): string => {
        const trimmedKey = key.trim();
        if (!/^([a-f0-9]{64})$/.test(trimmedKey)) {
            return 'Private key must be a 64-character lowercase hex string.';
        }
        return '';
    };

    const validateStorageURL = (url: string): string => {
        if (!url) {
            return 'Storage URL is required.';
        }
        try {
            // Attempt constructing a URL object
            new URL(url);
            return '';
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            return 'Invalid URL format.';
        }
    };

    const handleSubmit = async () => {
        // Clear previous errors
        setPrivKeyError('');
        setStorageError('');

        // Validate Private Key
        const privKeyValidationError = validatePrivateKey(privKeyInput);
        if (privKeyValidationError) {
            setPrivKeyError(privKeyValidationError);
            return;
        }

        // Validate Storage URL (if isCustomUrl, we rely on user input; otherwise use selection)
        const currentStorage = isCustomUrl ? storageInput.trim() : storageSelect.trim();
        const storageValidationError = validateStorageURL(currentStorage);
        if (storageValidationError) {
            setStorageError(storageValidationError);
            return;
        }

        // All validations passed
        setIsLoading(true);
        try {
            localStorage.setItem('brc100privkey', privKeyInput.trim());
            localStorage.setItem('brc100storage', currentStorage);
            localStorage.setItem('brc100network', networkInput);

            const newWallet = await makeWallet(networkInput, privKeyInput.trim(), currentStorage);
            setWallet(newWallet);
            navigate('/actions');
        } catch (error) {
            // Potentially set an error message if makeWallet fails
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const storageOptions = networkInput === 'main'
        ? mainnetStorageOptions
        : testnetStorageOptions;

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100vh"
            sx={{ px: 2 }}
        >
            <Paper
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 500,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                }}
            >
                <Typography variant="h5" gutterBottom>
                    Configure Your Wallet
                </Typography>

                {/* Network Selection */}
                <FormControl fullWidth>
                    <InputLabel>Network</InputLabel>
                    <Select
                        value={networkInput}
                        label="Network"
                        onChange={handleNetworkChange}
                    >
                        <MenuItem value="main">Mainnet</MenuItem>
                        <MenuItem value="test">Testnet</MenuItem>
                    </Select>
                </FormControl>

                {/* Private Key Input */}
                <Box display="flex" flexDirection="column" gap={1}>
                    <TextField
                        label="Private Key (64-char hex)"
                        fullWidth
                        value={privKeyInput}
                        onChange={(e) => setPrivKeyInput(e.target.value)}
                        error={!!privKeyError}
                        helperText={privKeyError}
                    />
                    <Button
                        variant="outlined"
                        onClick={handleGeneratePrivKey}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        Generate Random Key
                    </Button>
                </Box>

                {/* Storage Selection */}
                <FormControl fullWidth error={!!storageError}>
                    <InputLabel>Storage Server</InputLabel>
                    <Select
                        value={isCustomUrl ? 'custom' : storageSelect}
                        label="Storage Server"
                        onChange={handleStorageSelectChange}
                    >
                        {storageOptions.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                                {opt}
                            </MenuItem>
                        ))}
                        <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                    {!!storageError && <FormHelperText>{storageError}</FormHelperText>}
                </FormControl>

                {/* Custom Storage URL TextField (shown only if Custom is selected) */}
                {isCustomUrl && (
                    <TextField
                        label="Custom Storage URL"
                        fullWidth
                        value={storageInput}
                        onChange={(e) => setStorageInput(e.target.value)}
                        error={!!storageError}
                    />
                )}

                {/* Submit Button + Loading Indicator */}
                <Box
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    gap={2}
                    mt={2}
                >
                    {isLoading && <CircularProgress size={24} />}
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isLoading}
                    >
                        Save & Continue
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

export default HomePage;
