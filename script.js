document.addEventListener('DOMContentLoaded', () => {
    // --- Core UI Elements ---
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const browseFilesSpan = document.querySelector('.browse-files');
    const uploadedFileList = document.getElementById('uploaded-file-list'); // List for displaying names
    const compressButton = document.getElementById('compressButton');
    const clearQueueButton = document.getElementById('clearQueueButton');

    // --- Compression Settings Elements ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const presetRadioButtons = document.querySelectorAll('input[name="compressionPreset"]');
    const compressionQualitySlider = document.getElementById('compressionQualitySlider');
    const qualityValueDisplay = document.getElementById('qualityValueDisplay');
    const optimizeForWebCheckbox = document.getElementById('optimizeForWeb');
    const removeMetadataCheckbox = document.getElementById('removeMetadata');

    // --- Output Sections ---
    const processingQueueSection = document.getElementById('processing-queue-section');
    const compressedOutputSection = document.getElementById('compressed-output-section');
    const resultsContainer = document.getElementById('results-container');

    // --- Queue Summary Elements ---
    const queueStatusDisplay = document.getElementById('queueStatus');
    const processedCountDisplay = document.getElementById('processedCount');
    const totalQueueCountDisplay = document.getElementById('totalQueueCount');
    const queueProgressBar = document.getElementById('queueProgressBar');

    // --- Overall Compression Summary Elements ---
    const totalOriginalSizeSpan = document.getElementById('totalOriginalSize');
    const totalCompressedSizeSpan = document.getElementById('totalCompressedSize');
    const totalSavedMemorySpan = document.getElementById('totalSavedMemory');
    const totalCompressionRatioSpan = document.getElementById('totalCompressionRatio');
    const downloadAllButton = document.getElementById('downloadAllButton');

    // --- Modal Elements ---
    const comparisonModal = document.getElementById('comparisonModal');
    const closeButton = document.querySelector('.close-button');
    const modalTitle = document.getElementById('modalTitle');
    const modalComparisonContainer = document.getElementById('modalComparisonContainer');
    const modalCanvas = document.getElementById('modalCanvas'); // Reference to the canvas element
    const modalCtx = modalCanvas.getContext('2d');
    const modalSlider = modalComparisonContainer.querySelector('.img-comparison-slider'); // Slider handle
    
    // Store loaded images for modal to avoid re-loading
    let modalOriginalImage = new Image();
    let modalCompressedImage = new Image();

    let uploadedFiles = []; // Stores objects: { file, originalUrl:string, originalSize:number, id:string, status:string, compressedUrl:string, compressedSize:number }
    let currentQuality;
    let isProcessingQueue = false;

    // --- Configuration Constants ---
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const SIMULATED_PROCESSING_DELAY_PER_ITEM_MS = 200; // Shorter delay now that it's client-side processing again
    
    // Fallback image for display errors (a tiny transparent pixel)
    const FALLBACK_IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    // --- Utility Functions (unchanged) ---

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // --- Tab Switching Logic (unchanged) ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${targetTab}-tab-content`).classList.add('active');

            if (uploadedFiles.length > 0) {
                console.log("Triggering compression from tab change.");
                initiateCompression();
            }
        });
    });

    // --- Preset Radio Button Handlers (unchanged) ---
    presetRadioButtons.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                currentQuality = parseInt(radio.value);
                compressionQualitySlider.value = currentQuality;
                qualityValueDisplay.textContent = `${currentQuality}%`;
                if (uploadedFiles.length > 0) {
                    console.log("Triggering compression from preset radio change.");
                    initiateCompression();
                }
            }
        });
    });

    // --- Custom Slider Handler (unchanged) ---
    compressionQualitySlider.addEventListener('input', () => {
        currentQuality = parseInt(compressionQualitySlider.value);
        qualityValueDisplay.textContent = `${currentQuality}%`;
        presetRadioButtons.forEach(radio => radio.checked = false);
        if (uploadedFiles.length > 0) {
            console.log("Triggering compression from custom slider change.");
            initiateCompression();
        }
    });

    // --- Advanced Options Checkbox Handlers (unchanged) ---
    [optimizeForWebCheckbox, removeMetadataCheckbox].forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (uploadedFiles.length > 0) {
                console.log("Triggering compression from advanced option change.");
                initiateCompression();
            }
        });
    });

    // --- Initial Quality Setup (unchanged) ---
    const defaultCheckedRadio = document.querySelector('input[name="compressionPreset"]:checked');
    if (defaultCheckedRadio) {
        currentQuality = parseInt(defaultCheckedRadio.value);
    } else {
        currentQuality = 75;
        document.querySelector('input[name="compressionPreset"][value="75"]').checked = true;
    }
    compressionQualitySlider.value = currentQuality;
    qualityValueDisplay.textContent = `${currentQuality}%`;


    // --- Drag and Drop Handlers (unchanged) ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // --- File Input Handlers ---
    browseFilesSpan.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files);
    });

    // --- Main File Handling Logic (validation, preview, queueing) ---
    async function handleFiles(files) {
        compressedOutputSection.style.display = 'none';
        processingQueueSection.style.display = 'none';
        resultsContainer.innerHTML = '';
        downloadAllButton.setAttribute('disabled', 'true');
        clearQueueButton.style.display = 'none';
        uploadedFileList.innerHTML = ''; // Clear the list of uploaded file names
        uploadedFiles = []; // Clear the internal array of file entries

        let newFilesPromises = []; // To hold promises for FileReader results

        // FIX: Add index 'i' to the forEach callback
        [...files].forEach((file, i) => { // <-- Corrected line
            if (!(file.type === 'image/jpeg' || file.type === 'image/jpg')) {
                alert(`File "${file.name}" is not a JPEG image and will be ignored.`);
                console.warn(`Skipping non-JPEG file: ${file.name}`);
                return;
            }

            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`File "${file.name}" (${formatBytes(file.size)}) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB and will be ignored.`);
                console.warn(`Skipping oversized file: ${file.name} (${formatBytes(file.size)})`);
                return;
            }

            const isDuplicate = uploadedFiles.some(
                (existingFile) => existingFile.file.name === file.name && existingFile.file.size === file.size
            );

            if (isDuplicate) {
                console.warn(`Skipping duplicate file: ${file.name}`);
                return;
            }

            // Create a promise for reading the file (this will be the originalUrl Data URL)
            const fileReaderPromise = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file); 
                reader.onloadend = () => {
                    if (reader.result) {
                        console.log(`[handleFiles] FileReader loaded "${file.name}". Data URL length: ${reader.result.length}.`);
                        resolve(reader.result);
                    } else {
                        console.error(`[handleFiles] FileReader result is empty for "${file.name}".`);
                        reject(new Error(`Empty FileReader result for ${file.name}.`));
                    }
                };
                reader.onerror = (error) => {
                    console.error(`[handleFiles] FileReader error for "${file.name}":`, error);
                    reject(new Error(`FileReader failed for ${file.name}.`));
                };
            });

            const fileEntry = {
                file: file,
                originalUrlPromise: fileReaderPromise, // Promise resolves with Data URL
                originalUrl: null, // Populated by promise later
                originalSize: file.size,
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                status: 'queued',
                compressedUrl: null, // Will be Data URL generated by client-side compression
                compressedSize: null,
            };
            uploadedFiles.push(fileEntry);
            addFileToListDisplay(fileEntry); // Update file list UI immediately
            
            // Handle original Data URL resolution
            fileReaderPromise.then(url => {
                fileEntry.originalUrl = url; // Populate originalUrl when ready
                updateImagePairResult(fileEntry); // Now update UI with original image
            }).catch(error => {
                console.error(`[handleFiles] Failed to load original Data URL for "${file.name}":`, error);
                fileEntry.status = 'failed';
                fileEntry.originalUrl = FALLBACK_IMAGE_DATA_URL; // Use fallback on failure
                updateImagePairResult(fileEntry);
            });

            newFilesPromises.push(fileReaderPromise.catch(e => null)); // Add to batch promises
        });

        await Promise.allSettled(newFilesPromises); // Wait for all FileReader operations to settle
        console.log("[handleFiles] All original Data URLs settled. Proceeding to initiateCompression.");
        initiateCompression();
        updateCompressButtonState();
        fileInput.value = '';
    }

    function addFileToListDisplay(fileEntry) {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-id', fileEntry.id);
        
        const fileNameSpan = document.createElement('span');
        fileNameSpan.classList.add('file-name');
        fileNameSpan.textContent = fileEntry.file.name;

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-btn-list');
        removeBtn.textContent = 'X';
        removeBtn.title = `Remove ${fileEntry.file.name}`;
        removeBtn.addEventListener('click', () => removeFile(fileEntry.id, listItem));

        listItem.appendChild(fileNameSpan);
        listItem.appendChild(removeBtn);
        uploadedFileList.appendChild(listItem);
    }

    function removeFile(idToRemove, listItemElement) {
        uploadedFiles = uploadedFiles.filter(fileEntry => fileEntry.id !== idToRemove);
        listItemElement.remove();
        updateCompressButtonState();

        const resultRowToRemove = document.querySelector(`.image-pair-row[data-id="${idToRemove}"]`);
        if (resultRowToRemove) {
            resultRowToRemove.remove();
        }

        if (uploadedFiles.length === 0) {
            console.log("No files left, hiding all sections.");
            compressedOutputSection.style.display = 'none';
            processingQueueSection.style.display = 'none';
            resultsContainer.innerHTML = '';
            downloadAllButton.setAttribute('disabled', 'true');
            clearQueueButton.style.display = 'none';
        } else {
            console.log("Files removed, re-triggering compression for remaining files.");
            if (!isProcessingQueue) {
                initiateCompression();
            } else {
                updateTotalStats();
            }
        }
    }

    function updateCompressButtonState() {
        if (uploadedFiles.length > 0 && !isProcessingQueue) {
            compressButton.removeAttribute('disabled');
        } else {
            compressButton.setAttribute('disabled', 'true');
        }
    }

    function updateQueueProgress(current, total) {
        processedCountDisplay.textContent = current;
        const progress = (current / total) * 100;
        queueProgressBar.style.width = `${progress}%`;
    }

    function updateTotalStats() {
        let totalOriginal = 0;
        let totalCompressed = 0;
        uploadedFiles.filter(f => f.status === 'completed').forEach(fileEntry => {
            totalOriginal += fileEntry.originalSize;
            totalCompressed += fileEntry.compressedSize;
        });

        totalOriginalSizeSpan.textContent = formatBytes(totalOriginal);
        totalCompressedSizeSpan.textContent = formatBytes(totalCompressed);
        const savedMemory = totalOriginal - totalCompressed;
        totalSavedMemorySpan.textContent = formatBytes(savedMemory);
        const overallReduction = totalOriginal > 0 ? ((totalOriginal - totalCompressed) / totalOriginal) * 100 : 0;
        totalCompressionRatioSpan.textContent = `${overallReduction.toFixed(1)}%`;
    }

    // --- Client-side compression function (RE-INTRODUCED for all previews) ---
    async function compressImageClientSide(dataUrl, quality, filename) {
        console.log(`[compressImageClientSide] Attempting client-side compress "${filename}" at quality ${quality}.`);
        return new Promise((resolve, reject) => {
            if (!dataUrl) {
                console.error(`[compressImageClientSide] dataUrl is null for "${filename}". Rejecting.`);
                reject(new Error(`Data URL is null for "${filename}".`));
                return;
            }

            const img = new Image();
            img.crossOrigin = "anonymous"; // Essential for images from other domains (not applicable for Data URLs, but good practice)
            img.src = dataUrl;
            
            img.onload = () => {
                console.log(`[compressImageClientSide] Image "${filename}" (original) loaded into Image object. Dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
                if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    console.error(`[compressImageClientSide] Image "${filename}" loaded but has zero dimensions (${img.naturalWidth}x${img.naturalHeight}). Cannot process.`);
                    reject(new Error(`Image "${filename}" has zero dimensions.`));
                    return;
                }
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                try {
                    ctx.drawImage(img, 0, 0);
                    console.log(`[compressImageClientSide] Image "${filename}" drawn onto canvas.`);
                } catch (drawError) {
                    console.error(`[compressImageClientSide] Error drawing image "${filename}" onto canvas:`, drawError);
                    reject(new Error(`Failed to draw image "${filename}" onto canvas.`));
                    return;
                }

                let compressedDataUrl;
                try {
                    compressedDataUrl = canvas.toDataURL('image/jpeg', quality / 100); 
                    console.log(`[compressImageClientSide] Canvas.toDataURL returned for "${filename}". Length: ${compressedDataUrl.length}`);
                } catch (toDataURLError) {
                    console.error(`[compressImageClientSide] Error calling toDataURL for "${filename}":`, toDataURLError);
                    reject(new Error(`Failed to export canvas for "${filename}".`));
                    return;
                }
                
                if (compressedDataUrl.length < 50 || compressedDataUrl.startsWith('data:,') || compressedDataUrl.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')) { 
                    console.warn(`[compressImageClientSide] Canvas.toDataURL returned potentially blank/invalid data for "${filename}" (quality: ${quality}). Length: ${compressedDataUrl.length}. Trying PNG fallback.`);
                    try {
                        const pngDataUrl = canvas.toDataURL('image/png');
                        if (pngDataUrl.length > 50 && !pngDataUrl.startsWith('data:,')) {
                             console.warn(`[compressImageClientSide] PNG fallback worked for "${filename}". Resolving with PNG. This suggests a JPEG encoding issue or image format peculiarity.`);
                             resolve(pngDataUrl);
                        } else {
                             reject(new Error(`Canvas.toDataURL returned blank for both JPEG and PNG for "${filename}".`));
                        }
                    } catch (pngError) {
                        console.error(`[compressImageClientSide] Error on PNG fallback for "${filename}":`, pngError);
                        reject(new Error(`Failed both JPEG and PNG exports for "${filename}".`));
                    }
                } else {
                    resolve(compressedDataUrl);
                }
            };

            img.onerror = (error) => {
                console.error(`[compressImageClientSide] Error loading image "${filename}" into Image object (src: ${dataUrl ? dataUrl.substring(0, 50) : 'null'}...):`, error);
                reject(new Error(`Failed to load image "${filename}" into Image object.`));
            };

            if (img.complete) {
                if (img.naturalWidth === 0 && img.naturalHeight === 0) {
                     img.onerror(new Event('error')); 
                } else {
                    setTimeout(() => img.onload(), 0); 
                }
            }
        });
    }

    async function initiateCompression() {
        if (isProcessingQueue || uploadedFiles.length === 0) {
            updateCompressButtonState();
            if (uploadedFiles.length === 0) {
                compressedOutputSection.style.display = 'none';
                processingQueueSection.style.display = 'none';
                resultsContainer.innerHTML = '';
                downloadAllButton.setAttribute('disabled', 'true');
                clearQueueButton.style.display = 'none';
            }
            return;
        }

        isProcessingQueue = true;
        compressButton.setAttribute('disabled', 'true');
        uploadedFileList.querySelectorAll('.remove-btn-list').forEach(btn => btn.style.display = 'none');
        clearQueueButton.style.display = 'inline-block';

        processingQueueSection.style.display = 'block';
        compressedOutputSection.style.display = 'block';

        resultsContainer.innerHTML = ''; // Clear previous compression results display

        let processedCount = 0;
        const totalItems = uploadedFiles.length;
        totalQueueCountDisplay.textContent = totalItems;
        queueStatusDisplay.textContent = 'Processing...';
        queueProgressBar.style.width = '0%';

        // Ensure all UI elements are set to 'queued' state and initial previews are set up
        for (const fileEntry of uploadedFiles) {
            fileEntry.status = 'queued'; // Reset status for potential re-runs
            fileEntry.compressedSize = null; // Clear previous compressed size
            
            createImagePairResult(fileEntry); 
        }

        const quality = currentQuality;
        const optimizeForWeb = optimizeForWebCheckbox.checked;
        const removeMetadata = removeMetadataCheckbox.checked;

        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileEntry = uploadedFiles[i];

            // Wait for originalUrl to be ready for this specific file
            let originalDataUrl = null;
            try {
                originalDataUrl = await fileEntry.originalUrlPromise; 
                fileEntry.originalUrl = originalDataUrl; // Set it definitively on fileEntry
                if (fileEntry.status !== 'failed') { // If FileReader already failed, don't override status
                    updateImagePairResult(fileEntry); // Update UI just in case it needed originalUrl
                }
            } catch (loadError) {
                console.error(`[initiateCompression] Original Data URL load failed for "${fileEntry.file.name}":`, loadError);
