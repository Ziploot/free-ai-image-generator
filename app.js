/* =======================================================
   ZIPLOOT - AI IMAGE GENERATOR CONTROLLER
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // DOM Elements
  const promptInput = document.getElementById('prompt');
  const modelSelect = document.getElementById('model');
  const ratioSelect = document.getElementById('aspect-ratio');
  const seedInput = document.getElementById('seed');
  const randomSeedBtn = document.getElementById('random-seed-btn');
  const generateBtn = document.getElementById('generate-btn');

  const viewport = document.querySelector('.image-viewport');
  const placeholderBox = document.getElementById('placeholder');
  const loaderBox = document.getElementById('loader');
  const loaderStatus = document.getElementById('loader-status');
  const resultImg = document.getElementById('result-img');
  
  const actionsPanel = document.getElementById('actions-panel');
  const downloadBtn = document.getElementById('download-btn');
  const shareBtn = document.getElementById('share-btn');
  
  const historyGrid = document.getElementById('history-grid');
  const noHistoryText = document.getElementById('no-history');

  // History State
  let historyList = JSON.parse(localStorage.getItem('ziploot_ai_gallery')) || [];

  // Initialize Gallery View
  updateGalleryUI();

  // Event Listeners
  randomSeedBtn.addEventListener('click', generateRandomSeed);
  generateBtn.addEventListener('click', generateImage);
  downloadBtn.addEventListener('click', downloadCurrentImage);
  shareBtn.addEventListener('click', shareCurrentImageLink);

  // Generate Random Seed
  function generateRandomSeed() {
    const randomSeed = Math.floor(Math.random() * 999999999);
    seedInput.value = randomSeed;
  }

  // Handle Image Generation
  async function generateImage() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert('Please enter a description for your image!');
      promptInput.focus();
      return;
    }

    const model = modelSelect.value;
    const ratio = ratioSelect.value;
    const seed = seedInput.value ? parseInt(seedInput.value) : Math.floor(Math.random() * 999999999);
    if (!seedInput.value) seedInput.value = seed; // Update UI if seed was blank

    // 1. Determine High-Resolution Image Dimensions based on aspect ratio
    let width = 1200;
    let height = 1200;
    if (ratio === '16:9') {
      width = 1600;
      height = 900;
    } else if (ratio === '9:16') {
      width = 900;
      height = 1600;
    }

    // 2. Show Loading State
    placeholderBox.classList.add('hidden');
    resultImg.classList.add('hidden');
    actionsPanel.classList.add('hidden');
    loaderBox.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.7';
    loaderStatus.textContent = 'Contacting AI neural networks...';

    // 3. Construct API URL
    const encodedPrompt = encodeURIComponent(prompt);
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true`;

    console.log('Generating AI Image via:', apiUrl);

    // 4. Pre-download the Image in Memory (Ensures smooth display without line-by-line loading)
    loaderStatus.textContent = 'Drawing high-res pixels & rendering textures...';
    
    try {
      const imgPreloader = new Image();
      imgPreloader.src = apiUrl;
      
      imgPreloader.onload = () => {
        // Image loaded successfully
        resultImg.src = apiUrl;
        resultImg.classList.remove('hidden');
        loaderBox.classList.add('hidden');
        actionsPanel.classList.remove('hidden');
        generateBtn.disabled = false;
        generateBtn.style.opacity = '1';

        // Add to history
        saveToHistory({
          prompt,
          model,
          ratio,
          seed,
          url: apiUrl
        });
      };

      imgPreloader.onerror = (err) => {
        throw new Error('Image generation timed out or server failed.');
      };

    } catch (error) {
      console.error(error);
      alert('Failed to generate image. Please try again or simplify your prompt.');
      loaderBox.classList.add('hidden');
      placeholderBox.classList.remove('hidden');
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
    }
  }

  // Save to history & LocalStorage
  function saveToHistory(item) {
    // Avoid duplicate prompts on consecutive generations
    if (historyList.length > 0 && historyList[0].url === item.url) {
      return;
    }

    historyList.unshift(item);
    if (historyList.length > 12) {
      historyList.pop(); // Keep only last 12 items
    }

    localStorage.setItem('ziploot_ai_gallery', JSON.stringify(historyList));
    updateGalleryUI();
  }

  // Update Gallery Grid UI
  function updateGalleryUI() {
    // Clear dynamic items
    const items = historyGrid.querySelectorAll('.gallery-item');
    items.forEach(el => el.remove());

    if (historyList.length === 0) {
      noHistoryText.classList.remove('hidden');
      return;
    }

    noHistoryText.classList.add('hidden');

    historyList.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'gallery-item';
      itemEl.innerHTML = `
        <img src="${item.url}" alt="${item.prompt}" loading="lazy" />
        <div class="gallery-item-overlay">
          <i data-lucide="maximize-2"></i>
        </div>
      `;

      itemEl.addEventListener('click', () => loadHistoryItem(index));
      historyGrid.appendChild(itemEl);
    });

    // Reinitialize lucide icons for newly added HTML
    lucide.createIcons();
  }

  // Load History Item back into UI
  function loadHistoryItem(index) {
    const item = historyList[index];
    promptInput.value = item.prompt;
    modelSelect.value = item.model;
    ratioSelect.value = item.ratio;
    seedInput.value = item.seed;

    // Set Image direct
    placeholderBox.classList.add('hidden');
    loaderBox.classList.add('hidden');
    resultImg.src = item.url;
    resultImg.classList.remove('hidden');
    actionsPanel.classList.remove('hidden');
  }

  // Download Current Image as a direct File
  async function downloadCurrentImage() {
    const currentUrl = resultImg.src;
    if (!currentUrl) return;

    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `<i class="spinner" style="width: 14px; height: 14px; border-width: 2px; margin-right: 5px;"></i> Downloading...`;

    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Clean filename
      const promptSnippet = promptInput.value.trim().substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `ziploot_ai_${promptSnippet || 'image'}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      // Fallback: Open in new tab
      window.open(currentUrl, '_blank');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<i data-lucide="download"></i> Download JPG`;
      lucide.createIcons();
    }
  }

  // Copy Image Link to Clipboard
  function shareCurrentImageLink() {
    const currentUrl = resultImg.src;
    if (!currentUrl) return;

    navigator.clipboard.writeText(currentUrl).then(() => {
      const originalText = shareBtn.innerHTML;
      shareBtn.innerHTML = `<i data-lucide="check"></i> Copied!`;
      lucide.createIcons();
      
      setTimeout(() => {
        shareBtn.innerHTML = originalText;
        lucide.createIcons();
      }, 2000);
    }).catch(err => {
      console.error(err);
      alert('Failed to copy. Here is the link:\n' + currentUrl);
    });
  }
});
