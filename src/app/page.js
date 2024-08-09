'use client';

import { useState, useEffect } from 'react';
import { Grid, Box, Stack, Typography, Button, Modal, TextField, IconButton } from '@mui/material';
import { firestore } from '@/firebase'; // Make sure to import storage from your Firebase config
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { getStorage } from 'firebase/storage';
const storage = getStorage();

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#53254e',
  border: '2px solid #000',
  borderRadius: '8px',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [openAIRecipes, setOpenAIRecipes] = useState(false); // Add state for AI recipes modal
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! Lets explore our possible recipes!"
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [inventoryListMessage, setInventoryListMessage] = useState('');


  const [aiResponse, setAiResponse] = useState('');



  const sendMessage = async () => {
    if (!inventoryListMessage.trim() || isLoading) return;
    setIsLoading(true)
  
    //setMessage('')
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: inventoryListMessage },
      { role: 'assistant', content: '' },
    ])
  
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inventoryListMessage }),
      })
  
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
  
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiText = '';
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
  
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + aiText },
          ];
        });
      }
      setAiResponse(aiText);
    } catch (error) {
      console.error('Error:', error)
      setMessages((messages) => [
        ...messages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ])
      setAiResponse("I'm sorry, but I encountered an error. Please try again later.");
    }

    setIsLoading(false)
  }

  const sendMessageOG = async () => {
    if (!inventoryListMessage.trim() || isLoading) return;
    setIsLoading(true);
    
    
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: inventoryListMessage },
      { role: 'assistant', content: '' },
    ])
  


    try {

      const lastTwoMessages = messages.slice(-1); // Get the last two elements from the messages array
      const requestBody = JSON.stringify([...lastTwoMessages, { role: 'user', content: inventoryListMessage }]);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,

      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
  
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
      }
      setAiResponse(text);
    } catch (error) {
      console.error('Error:', error);
      setMessages((messages) => [
        ...messages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
      setAiResponse("I'm sorry, but I encountered an error. Please try again later.");
    }
  
    setIsLoading(false);
  };

  const updateInventory = async () => {
    try {
      const inventoryCollection = collection(firestore, 'inventory');
      const snapshot = await getDocs(query(inventoryCollection));
      const inventoryList = snapshot.docs.map((doc) => ({ name: doc.id, ...doc.data() }));
      setInventory(inventoryList);
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  useEffect(() => {
    updateInventory();
  }, []);

  const handleImageUpload = async (file) => {
    try {
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `images/${uniqueFileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    return '';
  };

  const addItem = async (item, quantity, category, imageUrl) => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity: existingQuantity } = docSnap.data();
        await setDoc(docRef, { quantity: existingQuantity + quantity, category, imageUrl }, { merge: true });
      } else {
        await setDoc(docRef, { quantity, category, imageUrl });
      }
      await updateInventory();
      setItemName('');
      setQuantity(1);
      setCategory('');
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const removeItem = async (item) => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity, category } = docSnap.data();
        if (quantity === 1) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, { quantity: quantity - 1, category });
        }
        await updateInventory();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleOpen = (modalType) => () => {
    if (modalType === 'add') {
      setOpen(true);
    } else if (modalType === 'ai-recipes') {
      setOpenAIRecipes(true);
    }
  };
  
  const handleClose = () => {
    setOpen(false);
    setOpenAIRecipes(false);
    setImage(null);
  };

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(inventory.map((item) => item.category || 'Unknown'))];

  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
      console.log('Image selected:', event.target.files[0]); // Debugging log
    }
  };

  const handleCameraCapture = (event) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
    }
  };

  const handleAddItem = async () => {
    console.log('handleAddItem called'); // Debugging log
    try {
      let imageUrl = '';
      if (image) {
        console.log('There is an image');
        imageUrl = await handleImageUpload(image);
      }
      await addItem(itemName, quantity, category, imageUrl);
      const updatedInventory = await getInventory();
  
      // Prepare the inventory list message
      const message = `The following items were added to the inventory: ${updatedInventory.map(item => `${item.name} (Quantity: ${item.quantity}, Category: ${item.category})`).join(', ')}`;
      setInventoryListMessage(message); // Store the message
      console.log('inventoryListMessage:', message); // Print to console

  
      handleClose();
    } catch (error) {
      console.error('Error in handleAddItem:', error);
    }
  };

  const getInventory = async () => {
    try {
      const inventoryCollection = collection(firestore, 'inventory');
      const snapshot = await getDocs(query(inventoryCollection));
      return snapshot.docs.map((doc) => ({ name: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  };
  
  const handleButtonClick = () => {
    handleOpen('ai-recipes')();
  };

  const handleGenerateRecipes = async () => {
    if (!inventoryListMessage || !inventoryListMessage.trim() || isLoading) {
      if (!inventoryListMessage) {
        setMessages([...messages, { role: 'assistant', content: "There are no items in your inventory. Please add some items before generating recipes." }]);
      }
      return;
    }
    setIsLoading(true);
  
    try {
      // Send the stored inventory list message (if it has content)
      if (inventoryListMessage.trim()) {
        await sendMessageOG();
      }
    } catch (error) {
      console.error('Error in handleGenerateRecipes:', error);
    }
  
    setIsLoading(false);
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={2}
      sx={{ backgroundImage: 'url(/background2.jpg)', backgroundSize: 'cover' }}
    >
      <Grid container spacing={2} sx={{ maxWidth: '1200px', width: '100%' }}>
        <Grid item xs={12} sm={4} md={3}>
          <Box
            display="flex"
            flexDirection="column"
            border="1px solid #333"
            borderRadius="8px"
            p={2}
            height="100%"
            overflow="auto"
            sx={{ 
              backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'top',
              boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)', 
            }}
          >
            <Typography variant="h5" color="white" textAlign="center" mb={2}>
              Categories
            </Typography>
            <Stack spacing={1} alignItems="center" color="white">
              {categories.map((category) => (
                <Typography key={category} variant="body1" color="white" textAlign="center">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Grid>
        <Grid item xs={12} sm={8} md={9}>
          <Box
            width="100%"
            bgcolor="rgba(255, 105, 180, 0.5)"
            display="flex"
            justifyContent="center"
            alignItems="center"
            borderRadius="8px"
            mb={4}
            p={2}
            sx={{boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)', }}
          >
            <Typography variant="h4" color="#fff" textAlign="center">
              Inventory Management System
            </Typography>
          </Box>

          {/* Search Field */}
          <Box width="100%" mb={4}>
            <TextField
              label="Search"
              variant="outlined"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ 
                borderRadius: '8px', 
                backgroundColor: 'transparent',
                boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)',
                '& .MuiInputBase-input': {
                  color: 'white', // Change text color when focused
                },
                '& .MuiInputLabel-root': {
                  color: 'white', // Change label color when focused
                },
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 105, 180, 0.5)', // Change border color when focused
                  },
                },
              }}
            />
          </Box>

          <Box
            display="flex"
            justifyContent="center"
            width="100%" // Ensure the container takes up full width if needed
            mb={4}
          >
            <Button
              variant="contained"
              onClick={handleOpen('add')}
              className="button glowing-border"
              sx={{
                //width: '200px', // Adjust the width as needed
                fontSize: '2em', // Ensure this matches the CSS font-size
                backgroundColor: 'white', // Override default background color
                border: '2px solid #fff', // Match the CSS border
                color: '#fff', // Match the CSS text color
                marginRight: 2,
              }}
            >
              Add New Item
            </Button>
            <Button
              variant="contained"
              onClick={handleButtonClick}
              disabled={isLoading}
              className="button glowing-border-AI"
              sx={{
                fontSize: '2em', // Ensure this matches the CSS font-size
                backgroundColor: 'white', // Override default background color
                border: '2px solid #fff', // Match the CSS border
                color: '#fff', // Match the CSS text color
              }}
            >
              {isLoading ? 'Sending...' : 'AI Recipes'}
            </Button>
          </Box>

          {/* Inventory List */}
          <Box
            border="1px solid #333"
            borderRadius="8px"
            overflow="hidden"
            sx={{ backgroundColor: 'transparent' }}
          >
            <Box
              width="100%"
              bgcolor="#2a1647"
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              paddingX={1}
              borderRadius="0 0 8px 8px"
              sx={{
                boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)', 
              }}
            >
              <Typography variant="h6" color="#fff" textAlign="center" flex="1">
                Name
              </Typography>
              <Typography variant="h6" color="#fff" textAlign="center" flex="1">
                Quantity
              </Typography>
              <Typography variant="h6" color="#fff" textAlign="center" flex="1">
                Category
              </Typography>
              <Typography variant="h6" color="#fff" textAlign="center" flex="1">
                Actions
              </Typography>
            </Box>
            <Box
              width="100%"
              height="300px" // Adjust height as needed
              overflow="auto"
              p={1}
              display="flex"
              flexDirection="column"
              alignItems="center"
              sx={{
                '&::-webkit-scrollbar': {
                  width: '12px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '6px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(0, 0, 0, 0.4)',
                },
                boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)',
              }}
            >
              <Stack 
              spacing={0} 
              width="100%" 
              alignItems="center"
              sx={{
                boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)', 
              }}
              >
                {filteredInventory.map(({ name, quantity, category, imageUrl }) => (
                  <Box
                    key={name}
                    width="100%"
                    minHeight="150px"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    bgcolor="transparent"
                    paddingX={2}
                    borderRadius="8px"
                    sx={{ transition: 'background-color 0.3s', '&:hover': { backgroundColor: 'transparent' },
                   }}
                  >
                    <Box display="flex" alignItems="center">
                      {imageUrl && (
                        <img src={imageUrl} alt={name} width="50" height="50" style={{ marginRight: '10px' }} />
                      )}
                      <Typography variant="h6" color="white" textAlign="center">
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="white" textAlign="center">
                      {quantity}
                    </Typography>
                    <Typography variant="h6" color="white" textAlign="center">
                      {category || 'Unknown'}
                    </Typography>
                    <Button variant="contained" onClick={() => removeItem(name)} sx={{ backgroundColor: 'rgba(255, 105, 180, 0.5)', '&:hover': { backgroundColor: 'rgba(255, 105, 180, 0.9)' } }}>
                      Remove
                    </Button>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-title" variant="h6" color="white">
            Add Item
          </Typography>
          <Stack 
          direction="column" 
          spacing={2}
          sx={{
            boxShadow: '0px 4px 20px rgba(255, 105, 180, 0.5), 0px 0px 10px rgba(128, 0, 128, 0.3)', 
          }}>
            {/* Form Fields */}
            <TextField label="Item" variant="outlined" fullWidth value={itemName} onChange={(e) => setItemName(e.target.value)} 
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'white', // Default border color
                  },
                  '&:hover fieldset': {
                    borderColor: 'white', // Border color on hover
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'white', // Border color when focused
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'white', // Label color
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: 'white', // Label color when focused
                },
                '& .MuiOutlinedInput-root .MuiOutlinedInput-input': {
                  color: 'white', // Text color
                },
              }}
              />
            <TextField label="Quantity" variant="outlined" type="number" fullWidth value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white', // Default border color
                },
                '&:hover fieldset': {
                  borderColor: 'white', // Border color on hover
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'white', // Border color when focused
                },
              },
              '& .MuiInputLabel-root': {
                color: 'white', // Label color
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'white', // Label color when focused
              },
              '& .MuiOutlinedInput-root .MuiOutlinedInput-input': {
                color: 'white', // Text color
              },
            }}
            />
            <TextField label="Category" variant="outlined" fullWidth value={category} onChange={(e) => setCategory(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'white', // Default border color
                },
                '&:hover fieldset': {
                  borderColor: 'white', // Border color on hover
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'white', // Border color when focused
                },
              },
              '& .MuiInputLabel-root': {
                color: 'white', // Label color
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'white', // Label color when focused
              },
              '& .MuiOutlinedInput-root .MuiOutlinedInput-input': {
                color: 'white', // Text color
              },
            }}
            />
            {/* File Upload Buttons */}
            <input accept="image/*" style={{ display: 'none' }} id="upload-button-file" type="file" onChange={handleImageChange} />
            <label htmlFor="upload-button-file">
              <Button variant="contained" component="span" 
              sx={{ backgroundColor: 'rgba(255, 105, 180, 0.5)', '&:hover': { backgroundColor: 'rgba(255, 105, 180, 0.9)' } }}
              >Upload Image</Button>
            </label>
            <input accept="image/*" style={{ display: 'none' }} id="camera-button-file" type="file" capture="environment" onChange={handleCameraCapture} />
            <label htmlFor="camera-button-file">
              <IconButton color="pink" aria-label="capture picture" component="span" sx={{ fontSize: '10rem' }}>
                <PhotoCamera />
              </IconButton>
            </label>
            <Button variant="contained" onClick={handleAddItem}
            sx={{ backgroundColor: 'rgba(255, 105, 180, 0.5)', '&:hover': { backgroundColor: 'rgba(255, 105, 180, 0.9)' } }}
            >Add</Button>
          </Stack>
        </Box>
      </Modal>


      <Modal
        open={openAIRecipes}
        onClose={() => setOpenAIRecipes(false)}
        aria-labelledby="modal-title-ai-recipes"
        aria-describedby="modal-description-ai-recipes"
      >
        <Box 
          sx={{
            ...style,
            overflowY: 'auto', // Enable vertical scrolling
            maxHeight: '80vh', // Limit the height to 80% of the viewport height
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#888', // Customize scrollbar thumb color
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1', // Customize scrollbar track color
            },
          }}
        >
          <Typography id="modal-title-ai-recipes" variant="h6" color="white">
            AI Recipes
          </Typography>
          {/* Add content here as needed */}
          <Typography color="white">
            This is where AI-generated recipes will be displayed.
          </Typography>
          
          <Typography color="white">
            {aiResponse}
          </Typography>

          <Stack
            direction={'column'}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((inventoryListMessage, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  inventoryListMessage.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
              >
                <Box
                  bgcolor={
                    inventoryListMessage.role === 'assistant'
                      ? 'rgba(30, 144, 255, 0.2)'  // Semi-transparent blue for assistant messages
                      : 'rgba(156, 39, 176, 0.2)' // Semi-transparent purple for user messages
                  }
                  color="white"
                  borderRadius={16}
                  p={3}
                >
                  {inventoryListMessage.content}
                </Box>
              </Box>
            ))}
          </Stack>
              
          <Button
            variant="contained"
            onClick={handleGenerateRecipes}
            disabled={isLoading}
            className="button glowing-border-AI"
            sx={{
              fontSize: '2em', // Ensure this matches the CSS font-size
              backgroundColor: 'white', // Override default background color
              border: '2px solid #fff', // Match the CSS border
              color: '#fff', // Match the CSS text color
              marginRight: 2,
            }}
          >
            Generate Recipes
          </Button>   
        </Box>
      </Modal>
    </Box>
  );


}
