import React from 'react';
import './App.css';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Modal from '@mui/material/Modal';

import {menu, ingredients} from './data';
import pt from './translates/pt';

import img from './images/1.png';

const translates = {
    pt,
}

const upperCaseFirstLetter = (item) => `${String(item[0]).toUpperCase()}${item.slice(1)}`;

const mappedItems = menu.map(item => ({...item, disabled: false}));

const style = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: 24,
    display: 'flex',
    justifyContent: 'center',
    flexDirection: 'column',
    outline: 'none',
};

function App() {
    const [lang, setLang] = React.useState('pt');
    const [items, setItems] = React.useState(mappedItems);
    const [isEditMode, setEditMode] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const translater = (text) => {
        if (lang === 'en') return text;
        return translates[lang][text]
    };

    const handleDisableClick = (index) => {
        const newItems = [...items];
        newItems[index].disabled = !newItems[index].disabled;
        console.log(newItems)
        setItems(newItems);
    };

    const handleLangChange = (event) => {
        setLang(event.target.value);
    };

    return (
        <Container maxWidth="md">
            <Box m={2}>
                <Box  display="flex" justifyContent="space-between">
                        <Button variant="outlined" onClick={() => setEditMode(!isEditMode)}>Edit</Button>

                        <Select
                            value={lang}
                            label="Language"
                            onChange={handleLangChange}
                        >
                            <MenuItem value={'pt'}>Pt</MenuItem>
                            <MenuItem value={'en'}>En</MenuItem>
                        </Select>
                </Box>
                <Box mt={2}>
                    <Typography variant="h3" align="center">perturbar</Typography>
                </Box>

                <Grid container spacing={2} mt={2}>
                    {items.map((item, index) => (
                        <Grid item sx={12} md={6} key={item.id + item.title}>
                            <Card sx={{maxWidth: 345}}>
                                <CardMedia
                                    onClick={handleOpen}
                                    sx={{height: 140}}
                                    image={img}
                                    title="Image"
                                />
                                <CardContent>
                                    <Typography gutterBottom variant="h5" component="div">
                                        {item.title} <Typography
                                        color="red">{item.disabled ? `(${upperCaseFirstLetter(translater('unavailable'))})` : ''}</Typography>
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        {item.ingredients.map((item) =>
                                            upperCaseFirstLetter(translater(ingredients[item]))).join(', ')
                                        }
                                    </Typography>
                                </CardContent>
                                {
                                    isEditMode && (
                                        <CardActions>
                                            <Button size="small" onClick={() => handleDisableClick(index)}>Disable</Button>
                                        </CardActions>
                                    )
                                }

                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box style={style}
                     onClick={handleClose}
                >
                    <img
                        src={img}
                        alt="Dish"
                    />
                    <Button variant="contained">Close</Button>
                </Box>

            </Modal>
        </Container>
    );
}

export default App;
