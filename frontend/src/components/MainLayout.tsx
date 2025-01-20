import { Outlet, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
    Box,
    Container
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';

function MainLayout() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const navItems = [
        { name: 'Actions', path: '/actions' },
        { name: 'Outputs', path: '/outputs' },
        { name: 'Keys & Linkage', path: '/keys' },
        { name: 'Crypto', path: '/crypto' },
        { name: 'Certificates', path: '/certificates' },
        { name: 'Utilities', path: '/utilities' }
    ];

    const handleDrawerToggle = () => {
        setOpen((prev) => !prev);
    };

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ width: 240 }}>
            <List>
                {navItems.map((item) => (
                    <ListItemButton
                        key={item.path}
                        onClick={() => navigate(item.path)}
                    >
                        <ListItemText primary={item.name} />
                    </ListItemButton>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6">BRC-100 Wallet UI</Typography>
                </Toolbar>
            </AppBar>
            <Drawer open={open} onClose={handleDrawerToggle}>
                {drawer}
            </Drawer>

            <Container sx={{ flex: 1, py: 3 }}>
                <Outlet />
            </Container>
        </Box>
    );
}

export default MainLayout;
