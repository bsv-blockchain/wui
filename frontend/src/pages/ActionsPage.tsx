import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    TextField,
    Divider,
    Checkbox,
    FormControlLabel,
    Stack,
    List,
    ListItem,
    ListItemText,
    Pagination,
    Grid,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InputIcon from '@mui/icons-material/Input';
import DeleteIcon from '@mui/icons-material/Delete';
import { useWallet } from '../contexts/WalletContext';

interface ActionItem {
    txid: string;
    satoshis: number;
    status: string;
    isOutgoing: boolean;
    description: string;
    labels?: string[];
    version?: number;
    lockTime?: number;
    inputs?: Array<{
        sourceOutpoint: string;
        sourceSatoshis: number;
        sourceLockingScript?: string;
        unlockingScript?: string;
        inputDescription: string;
        sequenceNumber: number;
    }>;
    outputs?: Array<{
        outputIndex: number;
        satoshis: number;
        lockingScript?: string;
        spendable: boolean;
        outputDescription: string;
        basket?: string;
        tags?: string[];
        customInstructions?: string;
    }>;
}

// For createAction flows
interface CreateActionInputs {
    description: string;
    inputBEEFHex: string; // raw BEEF hex for input contexts if needed
    inputs: Array<{
        outpoint: string;
        unlockingScript?: string;
        unlockingScriptLength?: number;
        inputDescription: string;
        sequenceNumber?: number;
    }>;
    outputs: Array<{
        lockingScript: string;
        satoshis: number;
        outputDescription: string;
        basket?: string;
        customInstructions?: string;
        tags?: string[];
    }>;
    lockTime?: number;
    version?: number;
    labels?: string[];
    options: {
        signAndProcess: boolean;
        acceptDelayedBroadcast: boolean;
        trustSelf?: 'known'; // possible
        knownTxids?: string[];
        returnTXIDOnly: boolean;
        noSend: boolean;
        noSendChange?: string[];
        sendWith?: string[];
        randomizeOutputs: boolean;
    };
}

// For internalizeAction flows
interface InternalizeOutput {
    outputIndex: number;
    protocol: 'wallet payment' | 'basket insertion';
    paymentRemittance?: {
        derivationPrefix: string; // base64
        derivationSuffix: string; // base64
        senderIdentityKey: string; // pubkey hex
    };
    insertionRemittance?: {
        basket: string;
        customInstructions?: string;
        tags?: string[];
    };
}

function ActionsPage() {
    const { wallet } = useWallet();

    /**************************************************
     * List Filters & State
     **************************************************/
    const [labelsFilter, setLabelsFilter] = useState<string>('default');
    const [labelQueryMode, setLabelQueryMode] = useState<'any' | 'all'>('any');
    const [includeLabels, setIncludeLabels] = useState(false);
    const [includeInputs, setIncludeInputs] = useState(false);
    const [includeOutputs, setIncludeOutputs] = useState(false);
    const [limit, setLimit] = useState(5);
    const [actionsPage, setActionsPage] = useState(1);
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [totalActions, setTotalActions] = useState(0);
    const [loadingList, setLoadingList] = useState(false);
    const [listError, setListError] = useState<string>('');

    /**************************************************
     * CREATE ACTION Modal (Multi-Step)
     **************************************************/
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createData, setCreateData] = useState<CreateActionInputs>({
        description: '',
        inputBEEFHex: '',
        inputs: [],
        outputs: [],
        lockTime: undefined,
        version: undefined,
        labels: [],
        options: {
            signAndProcess: true,
            acceptDelayedBroadcast: true,
            returnTXIDOnly: false,
            noSend: false,
            randomizeOutputs: true
        }
    });
    const [createStep, setCreateStep] = useState<'form' | 'signing' | 'result'>('form');
    const [createResult, setCreateResult] = useState<any>(null);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string>('');

    // For "signing" sub-step (when createAction returns signableTransaction):
    const [signSpendsJson, setSignSpendsJson] = useState('{}');
    const [signLoading, setSignLoading] = useState(false);
    const [abortLoading, setAbortLoading] = useState(false);
    const [signError, setSignError] = useState('');

    /**************************************************
     * INTERNALIZE ACTION Modal
     **************************************************/
    const [internalizeModalOpen, setInternalizeModalOpen] = useState(false);
    const [internalizeTxHex, setInternalizeTxHex] = useState('');
    const [internalizeDescription, setInternalizeDescription] = useState('');
    const [internalizeOutputs, setInternalizeOutputs] = useState<InternalizeOutput[]>([]);
    const [internalizeLoading, setInternalizeLoading] = useState(false);
    const [internalizeError, setInternalizeError] = useState('');
    const [internalizeResult, setInternalizeResult] = useState<any>(null);

    /**************************************************
     * useEffect: load the list initially
     **************************************************/
    useEffect(() => {
        if (!wallet) return;
        fetchActions(actionsPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet, actionsPage, limit, includeLabels, includeInputs, includeOutputs, labelQueryMode]);

    /**************************************************
     * Fetch / list actions
     **************************************************/
    async function fetchActions(page: number) {
        if (!wallet) return;
        setLoadingList(true);
        setListError('');
        try {
            const labelArray = labelsFilter
                ? labelsFilter.split(',').map((l) => l.trim()).filter(Boolean)
                : [];
            const resp = await wallet.listActions({
                labels: labelArray,
                labelQueryMode,
                includeLabels,
                includeInputs,
                includeOutputs,
                limit,
                offset: (page - 1) * limit
            });
            setActions(resp.actions || []);
            setTotalActions(resp.totalActions || 0);
        } catch (err: any) {
            console.error('listActions error:', err);
            setListError(err?.message || String(err));
        } finally {
            setLoadingList(false);
        }
    }

    /**************************************************
     * Create Action Flow
     **************************************************/
    function handleOpenCreateModal() {
        setCreateModalOpen(true);
        setCreateStep('form');
        // Reset everything
        setCreateData({
            description: '',
            inputBEEFHex: '',
            inputs: [],
            outputs: [],
            lockTime: undefined,
            version: undefined,
            labels: [],
            options: {
                signAndProcess: true,
                acceptDelayedBroadcast: true,
                returnTXIDOnly: false,
                noSend: false,
                randomizeOutputs: true
            }
        });
        setCreateResult(null);
        setCreateError('');
    }

    function handleCloseCreateModal() {
        setCreateModalOpen(false);
    }

    async function doCreateAction() {
        if (!wallet) return;
        setCreateLoading(true);
        setCreateError('');
        setCreateStep('form');
        setCreateResult(null);
        try {
            const resp = await wallet.createAction({
                description: createData.description,
                inputBEEF: parseHexString(createData.inputBEEFHex),
                inputs: createData.inputs,
                outputs: createData.outputs,
                lockTime: createData.lockTime,
                version: createData.version,
                labels: createData.labels,
                options: { ...createData.options }
            });
            setCreateResult(resp);

            // If there's a signableTransaction, we go to the "signing" step
            if (resp?.signableTransaction) {
                setCreateStep('signing');
            } else {
                // no sign needed, show final result
                setCreateStep('result');
            }
            // refresh the list
            fetchActions(actionsPage);
        } catch (err: any) {
            console.error('createAction error:', err);
            setCreateError(err?.message || String(err));
        } finally {
            setCreateLoading(false);
        }
    }

    /** sign the transaction from createAction’s result */
    async function doSignAction() {
        if (!wallet || !createResult?.signableTransaction) return;
        setSignLoading(true);
        setSignError('');
        try {
            const parsedSpends = JSON.parse(signSpendsJson);
            const resp = await wallet.signAction({
                reference: createResult.signableTransaction.reference,
                spends: parsedSpends
            });
            setCreateResult(resp);
            setCreateStep('result');
            // refresh
            fetchActions(actionsPage);
        } catch (err: any) {
            console.error('signAction error:', err);
            setSignError(err?.message || String(err));
        } finally {
            setSignLoading(false);
        }
    }

    /** abort the partially created action */
    async function doAbortAction() {
        if (!wallet || !createResult?.signableTransaction) return;
        setAbortLoading(true);
        setSignError('');
        try {
            const ref = createResult.signableTransaction.reference;
            const resp = await wallet.abortAction({ reference: ref });
            console.log('abortAction result:', resp);
            setCreateStep('result');
            setCreateResult(resp);
            // refresh
            fetchActions(actionsPage);
        } catch (err: any) {
            console.error('abortAction error:', err);
            setSignError(err?.message || String(err));
        } finally {
            setAbortLoading(false);
        }
    }

    /**************************************************
     * Internalize Action Flow
     **************************************************/
    function handleOpenInternalizeModal() {
        setInternalizeModalOpen(true);
        setInternalizeTxHex('');
        setInternalizeDescription('');
        setInternalizeOutputs([]);
        setInternalizeLoading(false);
        setInternalizeError('');
        setInternalizeResult(null);
    }

    function handleCloseInternalizeModal() {
        setInternalizeModalOpen(false);
    }

    function addInternalizeOutput() {
        setInternalizeOutputs((prev) => [
            ...prev,
            {
                outputIndex: 0,
                protocol: 'wallet payment',
                paymentRemittance: {
                    derivationPrefix: '',
                    derivationSuffix: '',
                    senderIdentityKey: ''
                }
            }
        ]);
    }

    async function doInternalize() {
        if (!wallet) return;
        setInternalizeLoading(true);
        setInternalizeError('');
        setInternalizeResult(null);
        try {
            // parse the AtomicBEEF from hex
            const txBytes = parseHexString(internalizeTxHex);
            const resp = await wallet.internalizeAction({
                tx: txBytes,
                outputs: internalizeOutputs,
                description: internalizeDescription
            });
            setInternalizeResult(resp);
            // Refresh
            fetchActions(actionsPage);
        } catch (err: any) {
            console.error('internalizeAction error:', err);
            setInternalizeError(err?.message || String(err));
        } finally {
            setInternalizeLoading(false);
        }
    }

    /**************************************************
     * Utility
     **************************************************/
    function parseHexString(hex: string): number[] {
        const clean = hex.replace(/^0x/, '').replace(/[^0-9a-fA-F]/g, '');
        const result: number[] = [];
        for (let i = 0; i < clean.length; i += 2) {
            result.push(parseInt(clean.substr(i, 2), 16));
        }
        return result;
    }

    /**************************************************
     * Render
     **************************************************/
    return (
        <Box>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
            >
                <Typography variant="h4" gutterBottom>
                    Actions
                </Typography>
                {/* Actions on the top right */}
                <Stack direction="row" spacing={2}>
                    <Button
                        startIcon={<InputIcon />}
                        variant="outlined"
                        onClick={handleOpenInternalizeModal}
                    >
                        Internalize
                    </Button>
                    <Button
                        startIcon={<AddIcon />}
                        variant="contained"
                        onClick={handleOpenCreateModal}
                    >
                        Create Action
                    </Button>
                </Stack>
            </Stack>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">Filters</Typography>
                <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            label="Labels (comma-separated)"
                            value={labelsFilter}
                            onChange={(e) => setLabelsFilter(e.target.value)}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth>
                            <InputLabel>Label Query Mode</InputLabel>
                            <Select
                                label="Label Query Mode"
                                value={labelQueryMode}
                                onChange={(e) =>
                                    setLabelQueryMode(e.target.value as 'any' | 'all')
                                }
                            >
                                <MenuItem value="any">Any</MenuItem>
                                <MenuItem value="all">All</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={includeLabels}
                                    onChange={(e) => setIncludeLabels(e.target.checked)}
                                />
                            }
                            label="Include Labels"
                        />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={includeInputs}
                                    onChange={(e) => setIncludeInputs(e.target.checked)}
                                />
                            }
                            label="Include Inputs"
                        />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={includeOutputs}
                                    onChange={(e) => setIncludeOutputs(e.target.checked)}
                                />
                            }
                            label="Include Outputs"
                        />
                    </Grid>
                </Grid>
                <Box textAlign="right" sx={{ mt: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            setActionsPage(1);
                            fetchActions(1);
                        }}
                    >
                        Apply Filters
                    </Button>
                </Box>
            </Paper>

            {/* List */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Action List</Typography>
                    <FormControl size="small" sx={{ width: 100 }}>
                        <InputLabel>Limit</InputLabel>
                        <Select
                            label="Limit"
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setActionsPage(1);
                            }}
                        >
                            <MenuItem value={5}>5</MenuItem>
                            <MenuItem value={10}>10</MenuItem>
                            <MenuItem value={25}>25</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>

                {loadingList && <Typography sx={{ mt: 2 }}>Loading...</Typography>}
                {listError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {listError}
                    </Alert>
                )}

                <List dense>
                    {actions.map((a, i) => (
                        <ListItem key={i} sx={{ borderBottom: '1px solid #eee' }}>
                            <ListItemText
                                primary={`TXID: ${a.txid} - Desc: ${a.description} - Status: ${a.status}`}
                                secondary={
                                    <>
                                        {a.labels?.length
                                            ? `Labels: [${a.labels.join(', ')}] `
                                            : ''}
                                        {includeInputs && a.inputs?.length
                                            ? ` | ${a.inputs.length} inputs `
                                            : ''}
                                        {includeOutputs && a.outputs?.length
                                            ? ` | ${a.outputs.length} outputs `
                                            : ''}
                                        {a.satoshis ? ` | Satoshis: ${a.satoshis}` : ''}
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                </List>
                <Pagination
                    sx={{ mt: 2 }}
                    page={actionsPage}
                    count={Math.ceil(totalActions / limit)}
                    onChange={(_, val) => {
                        setActionsPage(val);
                    }}
                />
            </Paper>

            {/** CREATE ACTION MODAL */}
            <Dialog open={createModalOpen} onClose={handleCloseCreateModal} fullWidth maxWidth="lg">
                <DialogTitle>Create Action</DialogTitle>
                <DialogContent>
                    {createStep === 'form' && (
                        <CreateActionFormContent
                            createData={createData}
                            setCreateData={setCreateData}
                            createLoading={createLoading}
                            createError={createError}
                        />
                    )}

                    {createStep === 'signing' && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle1">Signing Phase</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Reference: {createResult?.signableTransaction?.reference}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Atomic BEEF (Hex):
                            </Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    background: '#f5f5f5',
                                    p: 1,
                                    maxHeight: 200,
                                    overflow: 'auto'
                                }}
                            >
                                {createResult?.signableTransaction?.tx
                                    ? bytesToHex(createResult.signableTransaction.tx)
                                    : ''}
                            </Box>
                            <TextField
                                label="Spends (JSON)"
                                multiline
                                rows={4}
                                fullWidth
                                sx={{ mt: 2 }}
                                value={signSpendsJson}
                                onChange={(e) => setSignSpendsJson(e.target.value)}
                            />
                            {signError && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                    {signError}
                                </Alert>
                            )}
                        </Box>
                    )}

                    {createStep === 'result' && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle1">Result</Typography>
                            <Box
                                sx={{
                                    mt: 1,
                                    background: '#f5f5f5',
                                    p: 1,
                                    maxHeight: 300,
                                    overflow: 'auto'
                                }}
                            >
                                <pre>{JSON.stringify(createResult, null, 2)}</pre>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {createStep === 'form' && (
                        <>
                            {createError && (
                                <Alert severity="error" sx={{ mr: 2, flex: 1 }}>
                                    {createError}
                                </Alert>
                            )}
                            <Button onClick={handleCloseCreateModal} disabled={createLoading}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                onClick={doCreateAction}
                                disabled={createLoading}
                            >
                                {createLoading ? 'Creating...' : 'Create'}
                            </Button>
                        </>
                    )}
                    {createStep === 'signing' && (
                        <>
                            {signError && (
                                <Alert severity="error" sx={{ mr: 2, flex: 1 }}>
                                    {signError}
                                </Alert>
                            )}
                            <Button onClick={handleCloseCreateModal} disabled={signLoading || abortLoading}>
                                Close
                            </Button>
                            <Button
                                variant="outlined"
                                color="warning"
                                onClick={doAbortAction}
                                disabled={signLoading || abortLoading}
                            >
                                {abortLoading ? 'Aborting...' : 'Abort'}
                            </Button>
                            <Button
                                variant="contained"
                                onClick={doSignAction}
                                disabled={signLoading || abortLoading}
                            >
                                {signLoading ? 'Signing...' : 'Sign'}
                            </Button>
                        </>
                    )}
                    {createStep === 'result' && (
                        <>
                            <Button
                                variant="contained"
                                onClick={handleCloseCreateModal}
                            >
                                Close
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/** INTERNALIZE ACTION MODAL */}
            <Dialog
                open={internalizeModalOpen}
                onClose={handleCloseInternalizeModal}
                fullWidth
                maxWidth="lg"
            >
                <DialogTitle>Internalize Action</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {internalizeError && <Alert severity="error">{internalizeError}</Alert>}
                        <TextField
                            label="Atomic BEEF (Hex)"
                            multiline
                            rows={4}
                            value={internalizeTxHex}
                            onChange={(e) => setInternalizeTxHex(e.target.value)}
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={internalizeDescription}
                            onChange={(e) => setInternalizeDescription(e.target.value)}
                            fullWidth
                        />

                        <Typography variant="subtitle2">Outputs</Typography>
                        {internalizeOutputs.map((o, idx) => (
                            <Box
                                key={idx}
                                sx={{
                                    p: 1,
                                    background: '#f7f7f7',
                                    mb: 1,
                                    borderRadius: 1,
                                    border: '1px solid #ccc'
                                }}
                            >
                                <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                                    <TextField
                                        label="Output Index"
                                        type="number"
                                        sx={{ width: 120 }}
                                        value={o.outputIndex}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10) || 0;
                                            updateInternalizeOutput(idx, { outputIndex: val });
                                        }}
                                    />
                                    <FormControl>
                                        <InputLabel>Protocol</InputLabel>
                                        <Select
                                            value={o.protocol}
                                            label="Protocol"
                                            onChange={(e) => {
                                                const protocol = e.target.value as
                                                    | 'wallet payment'
                                                    | 'basket insertion';
                                                updateInternalizeOutput(idx, { protocol });
                                            }}
                                            sx={{ width: 180 }}
                                        >
                                            <MenuItem value="wallet payment">Wallet Payment</MenuItem>
                                            <MenuItem value="basket insertion">Basket Insertion</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <IconButton
                                        color="warning"
                                        onClick={() => removeInternalizeOutput(idx)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Stack>

                                {o.protocol === 'wallet payment' && (
                                    <Stack direction="column" spacing={1}>
                                        <TextField
                                            label="Sender Identity Key (PubKey Hex)"
                                            value={o.paymentRemittance?.senderIdentityKey || ''}
                                            onChange={(e) =>
                                                updateInternalizeOutput(idx, {
                                                    paymentRemittance: {
                                                        ...o.paymentRemittance!,
                                                        senderIdentityKey: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Derivation Prefix (Base64)"
                                            value={o.paymentRemittance?.derivationPrefix || ''}
                                            onChange={(e) =>
                                                updateInternalizeOutput(idx, {
                                                    paymentRemittance: {
                                                        ...o.paymentRemittance!,
                                                        derivationPrefix: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Derivation Suffix (Base64)"
                                            value={o.paymentRemittance?.derivationSuffix || ''}
                                            onChange={(e) =>
                                                updateInternalizeOutput(idx, {
                                                    paymentRemittance: {
                                                        ...o.paymentRemittance!,
                                                        derivationSuffix: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                    </Stack>
                                )}

                                {o.protocol === 'basket insertion' && (
                                    <Stack direction="column" spacing={1}>
                                        <TextField
                                            label="Basket"
                                            value={o.insertionRemittance?.basket || ''}
                                            onChange={(e) =>
                                                updateInternalizeOutput(idx, {
                                                    insertionRemittance: {
                                                        ...o.insertionRemittance,
                                                        basket: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Custom Instructions"
                                            value={o.insertionRemittance?.customInstructions || ''}
                                            onChange={(e) =>
                                                updateInternalizeOutput(idx, {
                                                    insertionRemittance: {
                                                        ...o.insertionRemittance!,
                                                        customInstructions: e.target.value
                                                    }
                                                })
                                            }
                                        />
                                        <TextField
                                            label="Tags (comma-separated)"
                                            value={o.insertionRemittance?.tags?.join(', ') || ''}
                                            onChange={(e) =>
                                                updateInternalizeOutput(idx, {
                                                    insertionRemittance: {
                                                        ...o.insertionRemittance!,
                                                        tags: e.target.value
                                                            .split(',')
                                                            .map((t) => t.trim())
                                                            .filter(Boolean)
                                                    }
                                                })
                                            }
                                        />
                                    </Stack>
                                )}
                            </Box>
                        ))}
                        <Button variant="outlined" onClick={addInternalizeOutput}>
                            Add Output
                        </Button>

                        {internalizeResult && (
                            <Box sx={{ background: '#f5f5f5', p: 1, mt: 1 }}>
                                <Typography variant="subtitle2">Result</Typography>
                                <pre>{JSON.stringify(internalizeResult, null, 2)}</pre>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseInternalizeModal} disabled={internalizeLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={doInternalize}
                        disabled={internalizeLoading}
                    >
                        {internalizeLoading ? 'Processing...' : 'Internalize'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

    /**************************************************
     * Helper fns for internalize
     **************************************************/
    function updateInternalizeOutput(
        idx: number,
        patch: Partial<InternalizeOutput>
    ) {
        setInternalizeOutputs((prev) => {
            const newArr = [...prev];
            const current = { ...newArr[idx] };
            // If the patch includes nested fields, we do a shallow merge
            if (patch.paymentRemittance) {
                current.paymentRemittance = {
                    ...(current.paymentRemittance || {}),
                    ...patch.paymentRemittance
                };
            }
            if (patch.insertionRemittance) {
                current.insertionRemittance = {
                    ...(current.insertionRemittance || {}),
                    ...patch.insertionRemittance
                };
            }
            // For top-level fields like outputIndex, protocol:
            if (patch.outputIndex !== undefined) {
                current.outputIndex = patch.outputIndex;
            }
            if (patch.protocol !== undefined) {
                current.protocol = patch.protocol;
                // reset the other field in case we switched protocol
                if (patch.protocol === 'wallet payment') {
                    current.paymentRemittance = {
                        derivationPrefix: '',
                        derivationSuffix: '',
                        senderIdentityKey: ''
                    };
                    current.insertionRemittance = undefined;
                } else {
                    current.insertionRemittance = {
                        basket: ''
                    };
                    current.paymentRemittance = undefined;
                }
            }
            newArr[idx] = current;
            return newArr;
        });
    }

    function removeInternalizeOutput(idx: number) {
        setInternalizeOutputs((prev) => {
            const newArr = [...prev];
            newArr.splice(idx, 1);
            return newArr;
        });
    }

    /**************************************************
     * Utility for sign-phase to hex
     **************************************************/
    function bytesToHex(arr: number[]): string {
        return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
}

/**************************************************
 * A sub-component to gather createAction form fields
 * (the "form" step) with dynamic Inputs and Outputs.
 **************************************************/
function CreateActionFormContent(props: {
    createData: CreateActionInputs;
    setCreateData: React.Dispatch<React.SetStateAction<CreateActionInputs>>;
    createLoading: boolean;
    createError: string;
}) {
    const { createData, setCreateData, createLoading, createError } = props;

    // "Temp" state for adding a new input
    const [tempInput, setTempInput] = useState({
        outpoint: '',
        inputDescription: '',
        unlockingScript: '',
        unlockingScriptLength: '',
        sequenceNumber: ''
    });

    // "Temp" state for adding a new output
    const [tempOutput, setTempOutput] = useState({
        lockingScript: '',
        satoshis: 1000,
        outputDescription: '',
        basket: '',
        customInstructions: '',
        tags: ''
    });

    // At least one input or output is required
    const bothArraysEmpty =
        createData.inputs.length === 0 && createData.outputs.length === 0;

    /**************************************************
     * Input Management
     **************************************************/
    function addInput() {
        // Only add if there's at least an outpoint + description
        if (!tempInput.outpoint.trim() || !tempInput.inputDescription.trim()) {
            return;
        }
        setCreateData((prev) => ({
            ...prev,
            inputs: [
                ...prev.inputs,
                {
                    outpoint: tempInput.outpoint.trim(),
                    inputDescription: tempInput.inputDescription.trim(),
                    unlockingScript: tempInput.unlockingScript.trim() || undefined,
                    unlockingScriptLength: tempInput.unlockingScriptLength
                        ? parseInt(tempInput.unlockingScriptLength, 10)
                        : undefined,
                    sequenceNumber: tempInput.sequenceNumber
                        ? parseInt(tempInput.sequenceNumber, 10)
                        : undefined
                }
            ]
        }));
        // Reset local form
        setTempInput({
            outpoint: '',
            inputDescription: '',
            unlockingScript: '',
            unlockingScriptLength: '',
            sequenceNumber: ''
        });
    }

    function removeInput(index: number) {
        setCreateData((prev) => {
            const newArr = [...prev.inputs];
            newArr.splice(index, 1);
            return { ...prev, inputs: newArr };
        });
    }

    /**************************************************
     * Output Management
     **************************************************/
    function addOutput() {
        // Must have a lockingScript + outputDescription
        if (!tempOutput.lockingScript.trim() || !tempOutput.outputDescription.trim()) {
            return;
        }
        setCreateData((prev) => ({
            ...prev,
            outputs: [
                ...prev.outputs,
                {
                    lockingScript: tempOutput.lockingScript.trim(),
                    satoshis: tempOutput.satoshis,
                    outputDescription: tempOutput.outputDescription.trim(),
                    basket: tempOutput.basket ? tempOutput.basket.trim() : undefined,
                    customInstructions: tempOutput.customInstructions
                        ? tempOutput.customInstructions.trim()
                        : undefined,
                    tags: tempOutput.tags
                        ? tempOutput.tags
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean)
                        : undefined
                }
            ]
        }));
        // Reset local form
        setTempOutput({
            lockingScript: '',
            satoshis: 1000,
            outputDescription: '',
            basket: '',
            customInstructions: '',
            tags: ''
        });
    }

    function removeOutput(index: number) {
        setCreateData((prev) => {
            const newArr = [...prev.outputs];
            newArr.splice(index, 1);
            return { ...prev, outputs: newArr };
        });
    }

    /**************************************************
     * Render
     **************************************************/
    return (
        <Box sx={{ mt: 1 }}>
            {/* Display any top-level error from the parent if present */}
            {createError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {createError}
                </Alert>
            )}

            {/* Basic fields */}
            <Stack spacing={2}>
                {/* Top-Level Description */}
                <TextField
                    label="Action Description"
                    value={createData.description}
                    onChange={(e) =>
                        setCreateData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    disabled={createLoading}
                    fullWidth
                />

                {/* Input BEEF */}
                <TextField
                    label="Input BEEF (Hex)"
                    helperText="Optional: Transaction context for inputs, if needed."
                    multiline
                    rows={2}
                    value={createData.inputBEEFHex}
                    onChange={(e) =>
                        setCreateData((prev) => ({ ...prev, inputBEEFHex: e.target.value }))
                    }
                    disabled={createLoading}
                    fullWidth
                />

                {/* LockTime & Version */}
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <TextField
                            label="LockTime"
                            type="number"
                            value={createData.lockTime || ''}
                            onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                setCreateData((prev) => ({ ...prev, lockTime: val }));
                            }}
                            fullWidth
                            disabled={createLoading}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Version"
                            type="number"
                            value={createData.version || ''}
                            onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                setCreateData((prev) => ({ ...prev, version: val }));
                            }}
                            fullWidth
                            disabled={createLoading}
                        />
                    </Grid>
                </Grid>

                {/* Labels */}
                <TextField
                    label="Labels (comma-separated)"
                    value={createData.labels?.join(', ') || ''}
                    onChange={(e) => {
                        const arr = e.target.value
                            .split(',')
                            .map((l) => l.trim())
                            .filter(Boolean);
                        setCreateData((prev) => ({ ...prev, labels: arr }));
                    }}
                    disabled={createLoading}
                    fullWidth
                />

                {/* Options */}
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Options
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createData.options.signAndProcess}
                                    onChange={(e) =>
                                        setCreateData((prev) => ({
                                            ...prev,
                                            options: {
                                                ...prev.options,
                                                signAndProcess: e.target.checked
                                            }
                                        }))
                                    }
                                />
                            }
                            label="signAndProcess"
                            disabled={createLoading}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createData.options.acceptDelayedBroadcast}
                                    onChange={(e) =>
                                        setCreateData((prev) => ({
                                            ...prev,
                                            options: {
                                                ...prev.options,
                                                acceptDelayedBroadcast: e.target.checked
                                            }
                                        }))
                                    }
                                />
                            }
                            label="acceptDelayedBroadcast"
                            disabled={createLoading}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createData.options.returnTXIDOnly}
                                    onChange={(e) =>
                                        setCreateData((prev) => ({
                                            ...prev,
                                            options: {
                                                ...prev.options,
                                                returnTXIDOnly: e.target.checked
                                            }
                                        }))
                                    }
                                />
                            }
                            label="returnTXIDOnly"
                            disabled={createLoading}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createData.options.noSend}
                                    onChange={(e) =>
                                        setCreateData((prev) => ({
                                            ...prev,
                                            options: {
                                                ...prev.options,
                                                noSend: e.target.checked
                                            }
                                        }))
                                    }
                                />
                            }
                            label="noSend"
                            disabled={createLoading}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={createData.options.randomizeOutputs}
                                    onChange={(e) =>
                                        setCreateData((prev) => ({
                                            ...prev,
                                            options: {
                                                ...prev.options,
                                                randomizeOutputs: e.target.checked
                                            }
                                        }))
                                    }
                                />
                            }
                            label="randomizeOutputs"
                            disabled={createLoading}
                        />
                    </Stack>
                </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Inputs */}
            <Typography variant="h6" gutterBottom>
                Inputs
            </Typography>

            {createData.inputs.map((inp, idx) => (
                <Paper
                    key={idx}
                    sx={{
                        p: 2,
                        mb: 1,
                        backgroundColor: '#f9f9f9',
                        position: 'relative'
                    }}
                    variant="outlined"
                >
                    <IconButton
                        size="small"
                        color="warning"
                        sx={{ position: 'absolute', top: 4, right: 4 }}
                        onClick={() => removeInput(idx)}
                        disabled={createLoading}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Outpoint (txid.index)"
                                value={inp.outpoint}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Input Description"
                                value={inp.inputDescription}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Unlocking Script"
                                value={inp.unlockingScript || ''}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Unlocking Script Length"
                                value={
                                    inp.unlockingScriptLength !== undefined
                                        ? String(inp.unlockingScriptLength)
                                        : ''
                                }
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Sequence Number"
                                value={
                                    inp.sequenceNumber !== undefined
                                        ? String(inp.sequenceNumber)
                                        : ''
                                }
                                fullWidth
                                disabled
                            />
                        </Grid>
                    </Grid>
                </Paper>
            ))}

            <Box
                sx={{
                    p: 2,
                    border: '1px dashed #ccc',
                    borderRadius: 1,
                    mb: 2,
                    mt: 2
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Add New Input
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Outpoint (txid.index)"
                            value={tempInput.outpoint}
                            onChange={(e) =>
                                setTempInput((prev) => ({ ...prev, outpoint: e.target.value }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Input Description"
                            value={tempInput.inputDescription}
                            onChange={(e) =>
                                setTempInput((prev) => ({
                                    ...prev,
                                    inputDescription: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Unlocking Script"
                            value={tempInput.unlockingScript}
                            onChange={(e) =>
                                setTempInput((prev) => ({
                                    ...prev,
                                    unlockingScript: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Unlocking Script Length"
                            type="number"
                            value={tempInput.unlockingScriptLength}
                            onChange={(e) =>
                                setTempInput((prev) => ({
                                    ...prev,
                                    unlockingScriptLength: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Sequence Number"
                            type="number"
                            value={tempInput.sequenceNumber}
                            onChange={(e) =>
                                setTempInput((prev) => ({
                                    ...prev,
                                    sequenceNumber: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                </Grid>
                <Box textAlign="right" sx={{ mt: 1 }}>
                    <Button variant="outlined" onClick={addInput} disabled={createLoading}>
                        + Add Input
                    </Button>
                </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Outputs */}
            <Typography variant="h6" gutterBottom>
                Outputs
            </Typography>

            {createData.outputs.map((out, idx) => (
                <Paper
                    key={idx}
                    sx={{ p: 2, mb: 1, backgroundColor: '#f9f9f9', position: 'relative' }}
                    variant="outlined"
                >
                    <IconButton
                        size="small"
                        color="warning"
                        sx={{ position: 'absolute', top: 4, right: 4 }}
                        onClick={() => removeOutput(idx)}
                        disabled={createLoading}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={8}>
                            <TextField
                                label="Locking Script"
                                multiline
                                minRows={2}
                                value={out.lockingScript}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Satoshis"
                                type="number"
                                value={out.satoshis}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Output Description"
                                value={out.outputDescription}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Basket (optional)"
                                value={out.basket || ''}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Tags (if any)"
                                value={out.tags?.join(', ') || ''}
                                fullWidth
                                disabled
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Custom Instructions"
                                multiline
                                minRows={2}
                                value={out.customInstructions || ''}
                                fullWidth
                                disabled
                            />
                        </Grid>
                    </Grid>
                </Paper>
            ))}

            <Box
                sx={{
                    p: 2,
                    border: '1px dashed #ccc',
                    borderRadius: 1,
                    mb: 2,
                    mt: 2
                }}
            >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Add New Output
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={12}>
                        <TextField
                            label="Locking Script"
                            multiline
                            minRows={2}
                            value={tempOutput.lockingScript}
                            onChange={(e) =>
                                setTempOutput((prev) => ({
                                    ...prev,
                                    lockingScript: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Satoshis"
                            type="number"
                            value={tempOutput.satoshis}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setTempOutput((prev) => ({ ...prev, satoshis: val }));
                            }}
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                        <TextField
                            label="Output Description"
                            value={tempOutput.outputDescription}
                            onChange={(e) =>
                                setTempOutput((prev) => ({
                                    ...prev,
                                    outputDescription: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Basket (optional)"
                            value={tempOutput.basket}
                            onChange={(e) =>
                                setTempOutput((prev) => ({
                                    ...prev,
                                    basket: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Tags (comma-separated)"
                            value={tempOutput.tags}
                            onChange={(e) =>
                                setTempOutput((prev) => ({
                                    ...prev,
                                    tags: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Custom Instructions"
                            multiline
                            minRows={2}
                            value={tempOutput.customInstructions}
                            onChange={(e) =>
                                setTempOutput((prev) => ({
                                    ...prev,
                                    customInstructions: e.target.value
                                }))
                            }
                            disabled={createLoading}
                            fullWidth
                        />
                    </Grid>
                </Grid>
                <Box textAlign="right" sx={{ mt: 1 }}>
                    <Button variant="outlined" onClick={addOutput} disabled={createLoading}>
                        + Add Output
                    </Button>
                </Box>
            </Box>

            {/* If both arrays are empty, show a small warning */}
            {bothArraysEmpty && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    At least one input or one output is required.
                </Alert>
            )}
        </Box>
    );
}

export default ActionsPage;
