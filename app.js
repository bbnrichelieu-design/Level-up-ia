let currentMode = 'resume';
let currentTab = 'text';
let selectedAudioFile = null;
let selectedImageFile = null;

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/login.html';
    }
    return user;
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${isError ? 'error' : 'success'} show`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function selectMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    
    document.querySelectorAll('.mode-options').forEach(opt => {
        opt.style.display = 'none';
    });
    
    const optionsMap = {
        'resume': 'resumeOptions',
        'recette': 'recetteOptions',
        'polissage': 'polissageOptions',
        'image': 'imageOptions'
    };
    
    if (optionsMap[mode]) {
        document.getElementById(optionsMap[mode]).style.display = 'block';
    }
}

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.input-tab').forEach(tabContent => {
        tabContent.classList.remove('active');
    });
    
    const tabMap = {
        'text': 'textInput',
        'audio': 'audioInput',
        'image': 'imageInputTab'
    };
    
    document.getElementById(tabMap[tab]).classList.add('active');
}

function handleAudioSelect(event) {
    selectedAudioFile = event.target.files[0];
    if (selectedAudioFile) {
        document.getElementById('audioFileName').textContent = `📁 ${selectedAudioFile.name}`;
    }
}

function handleImageSelect(event) {
    selectedImageFile = event.target.files[0];
    if (selectedImageFile) {
        document.getElementById('imageFileName').textContent = `📁 ${selectedImageFile.name}`;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(selectedImageFile);
    }
}

function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        button.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

async function processText(event) {
    const user = checkAuth();
    const text = document.getElementById('inputText').value.trim();
    
    if (!text) {
        showNotification('Veuillez entrer du texte', true);
        return;
    }
    
    const button = event.currentTarget;
    setLoading(button, true);
    
    try {
        const params = {
            mode: currentMode,
            text: text,
            userId: user.uid
        };
        
        if (currentMode === 'resume') {
            params.format = document.getElementById('resumeFormat').value;
        } else if (currentMode === 'recette') {
            params.contrainte_alim = document.getElementById('recetteContrainte').value;
        } else if (currentMode === 'polissage') {
            params.ton = document.getElementById('polissageTon').value;
        }
        
        const response = await fetch('/api/ai/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayResult(data.result);
            updateUsage(data.usage);
        } else {
            showNotification(data.error || data.message || 'Erreur de traitement', true);
        }
    } catch (error) {
        showNotification('Erreur de connexion au serveur', true);
    } finally {
        setLoading(button, false);
    }
}

async function processAudio(event) {
    const user = checkAuth();
    
    if (!selectedAudioFile) {
        showNotification('Veuillez sélectionner un fichier audio', true);
        return;
    }
    
    const button = event.currentTarget;
    setLoading(button, true);
    
    try {
        const formData = new FormData();
        formData.append('audio', selectedAudioFile);
        formData.append('mode', currentMode);
        formData.append('userId', user.uid);
        
        if (currentMode === 'resume') {
            formData.append('format', document.getElementById('resumeFormat').value);
        } else if (currentMode === 'recette') {
            formData.append('contrainte_alim', document.getElementById('recetteContrainte').value);
        } else if (currentMode === 'polissage') {
            formData.append('ton', document.getElementById('polissageTon').value);
        }
        
        const response = await fetch('/api/ai/process-audio', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayResult(data.result, data.transcription);
            updateUsage(data.usage);
        } else {
            showNotification(data.error || 'Erreur de traitement audio', true);
        }
    } catch (error) {
        showNotification('Erreur de connexion au serveur', true);
    } finally {
        setLoading(button, false);
    }
}

async function processImage(event) {
    const user = checkAuth();
    
    if (!selectedImageFile) {
        showNotification('Veuillez sélectionner une image', true);
        return;
    }
    
    const button = event.currentTarget;
    setLoading(button, true);
    
    try {
        const formData = new FormData();
        formData.append('image', selectedImageFile);
        formData.append('mode', currentMode);
        formData.append('userId', user.uid);
        
        if (currentMode === 'resume') {
            formData.append('format', document.getElementById('resumeFormat').value);
        } else if (currentMode === 'recette') {
            formData.append('contrainte_alim', document.getElementById('recetteContrainte').value);
        } else if (currentMode === 'polissage') {
            formData.append('ton', document.getElementById('polissageTon').value);
        }
        
        const response = await fetch('/api/ai/process-image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayResult(data.result);
            updateUsage(data.usage);
        } else {
            showNotification(data.error || 'Erreur de traitement image', true);
        }
    } catch (error) {
        showNotification('Erreur de connexion au serveur', true);
    } finally {
        setLoading(button, false);
    }
}

function displayResult(result, transcription = null) {
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const transcriptionSection = document.getElementById('transcriptionSection');
    const transcriptionResult = document.getElementById('transcriptionResult');
    
    resultContent.textContent = result;
    
    if (transcription) {
        transcriptionResult.textContent = transcription;
        transcriptionSection.style.display = 'block';
    } else {
        transcriptionSection.style.display = 'none';
    }
    
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function copyResult() {
    const resultContent = document.getElementById('resultContent').textContent;
    navigator.clipboard.writeText(resultContent).then(() => {
        showNotification('Résultat copié dans le presse-papiers!');
    }).catch(() => {
        showNotification('Erreur lors de la copie', true);
    });
}

function clearResult() {
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('inputText').value = '';
    document.getElementById('audioFileName').textContent = '';
    document.getElementById('imageFileName').textContent = '';
    document.getElementById('imagePreview').innerHTML = '';
    selectedAudioFile = null;
    selectedImageFile = null;
}

async function loadUsage() {
    const user = checkAuth();
    
    try {
        const response = await fetch('/api/usage', {
            headers: {
                'x-user-id': user.uid
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateUsage(data.usage);
        }
    } catch (error) {
        console.error('Erreur chargement usage:', error);
    }
}

function updateUsage(usage) {
    document.getElementById('usageInfo').textContent = `Utilisation: ${usage}/50 requêtes aujourd'hui`;
}

checkAuth();
loadUsage();
