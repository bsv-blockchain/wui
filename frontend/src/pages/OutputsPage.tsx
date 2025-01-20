import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Stack,
    TextField,
    Button,
    List,
    ListItem,
    ListItemText,
    Pagination
} from '@mui/material';
import { useWallet } from '../contexts/WalletContext';

function OutputsPage() {
    const { wallet } = useWallet();
    const [basket, setBasket] = useState('myBasket');
    const [tags, setTags] = useState('');
    const [outputs, setOutputs] = useState<any[]>([]);
    const [totalOutputs, setTotalOutputs] = useState(0);
    const [page, setPage] = useState(1);

    const listOutputs = async (pg: number) => {
        if (!wallet) return;
        try {
            const tagArr = tags
                ? tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [];
            const resp = await wallet.listOutputs({
                basket,
                tags: tagArr,
                tagQueryMode: 'any',
                includeCustomInstructions: true,
                includeTags: true,
                includeLabels: false, // or true if you want to see labels for the TX
                limit: 5,
                offset: (pg - 1) * 5
            });
            setOutputs(resp.outputs);
            setTotalOutputs(resp.totalOutputs);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (wallet) {
            listOutputs(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet]);

    const handleRelinquish = async (outpoint: string) => {
        if (!wallet) return;
        try {
            await wallet.relinquishOutput({
                basket,
                output: outpoint
            });
            listOutputs(page);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Outputs</Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="center"
                >
                    <TextField
                        label="Basket"
                        value={basket}
                        onChange={(e) => setBasket(e.target.value)}
                    />
                    <TextField
                        label="Tags (comma-separated)"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                    />
                    <Button variant="contained" onClick={() => listOutputs(1)}>
                        Refresh
                    </Button>
                </Stack>
            </Paper>

            <Paper sx={{ p: 2 }}>
                <List>
                    {outputs.map((o, i) => (
                        <ListItem
                            key={i}
                            sx={{
                                borderBottom: '1px solid #eee'
                            }}
                        >
                            <ListItemText
                                primary={`Outpoint: ${o.outpoint} | Sats: ${o.satoshis}`}
                                secondary={
                                    <>
                                        LockingScript: {o.lockingScript || 'N/A'} <br />
                                        Tags: {o.tags?.join(', ') || 'none'} <br />
                                        Custom: {o.customInstructions || 'N/A'}
                                    </>
                                }
                            />
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={() => handleRelinquish(o.outpoint)}
                            >
                                Relinquish
                            </Button>
                        </ListItem>
                    ))}
                </List>
                <Pagination
                    sx={{ mt: 2 }}
                    page={page}
                    count={Math.ceil(totalOutputs / 5)}
                    onChange={(_, val) => {
                        setPage(val);
                        listOutputs(val);
                    }}
                />
            </Paper>
        </Box>
    );
}

export default OutputsPage;
