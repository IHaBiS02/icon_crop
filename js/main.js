document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const cropView = document.getElementById('crop-view');
    const resizeView = document.getElementById('resize-view');

    const imageUpload = document.getElementById('imageUpload');
    const imageToCrop = document.getElementById('imageToCrop');
    const cropConfirmButton = document.getElementById('cropConfirmButton');
    const cropLoadingSpinner = document.getElementById('cropLoadingSpinner');

    const croppedPreview = document.getElementById('croppedPreview');
    const widthInput = document.getElementById('widthInput'); // 단일 입력 필드
    const addSizeButton = document.getElementById('addSizeButton'); // 사이즈 추가 버튼
    const selectedSizesContainer = document.getElementById('selectedSizesContainer'); // 선택된 사이즈 표시 영역
    const resizeAndDownloadButton = document.getElementById('resizeAndDownloadButton');
    const resizeLoadingSpinner = document.getElementById('resizeLoadingSpinner');
    const downloadLinksContainer = document.getElementById('downloadLinksContainer');
    const backToCropButton = document.getElementById('backToCropButton');

    let cropper = null;
    let originalFileName = '';
    const picaInstance = pica();
    let selectedSizes = new Set(); // 중복 방지를 위해 Set 사용

    // --- 1단계: 이미지 업로드 및 크롭 (이전과 동일) ---
    imageUpload.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            originalFileName = file.name.split('.').slice(0, -1).join('.');
            const reader = new FileReader();

            cropLoadingSpinner.style.display = 'block';
            imageToCrop.style.display = 'none';
            cropConfirmButton.style.display = 'none';

            reader.onload = (e) => {
                imageToCrop.src = e.target.result;
                imageToCrop.style.display = 'block';

                if (cropper) {
                    cropper.destroy();
                }
                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1 / 1,
                    viewMode: 1,
                    background: false,
                    movable: true,
                    zoomable: true,
                    rotatable: false,
                    scalable: false,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxResizable: true,
                    dragMode: 'move',
                    ready: () => {
                        cropLoadingSpinner.style.display = 'none';
                        cropConfirmButton.style.display = 'block';
                    }
                });
            };
            reader.readAsDataURL(file);
        } else {
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            imageToCrop.src = '#';
            imageToCrop.style.display = 'none';
            cropConfirmButton.style.display = 'none';
            originalFileName = '';
        }
    });

    cropConfirmButton.addEventListener('click', () => {
        if (!cropper) {
            alert('크롭할 이미지가 없습니다.');
            return;
        }
        cropLoadingSpinner.style.display = 'block';
        const croppedCanvas = cropper.getCroppedCanvas();

        if (!croppedCanvas) {
            alert('이미지를 크롭하는데 실패했습니다.');
            cropLoadingSpinner.style.display = 'none';
            return;
        }

        const croppedImageDataURL = croppedCanvas.toDataURL('image/png');
        croppedPreview.src = croppedImageDataURL;

        cropView.style.display = 'none';
        resizeView.style.display = 'block';
        cropLoadingSpinner.style.display = 'none';

        // 리사이즈 섹션 초기화
        downloadLinksContainer.innerHTML = '<p><em>리사이즈된 이미지가 준비되면 여기에 표시됩니다.</em></p>';
        selectedSizes.clear(); // 선택된 사이즈 목록 초기화
        renderSelectedSizes(); // 화면에도 반영
        widthInput.value = ''; // 입력 필드 초기화
    });

    // --- 2단계: 리사이즈 및 다운로드 (수정된 부분) ---

    // 선택된 사이즈 목록을 화면에 렌더링하는 함수
    function renderSelectedSizes() {
        selectedSizesContainer.innerHTML = ''; // 기존 태그 모두 제거
        if (selectedSizes.size === 0) {
            selectedSizesContainer.innerHTML = '<small><em>추가 버튼을 눌러 사이즈를 등록하세요.</em></small>';
            return;
        }
        // Set을 배열로 변환 후 정렬 (숫자 크기 순)
        const sortedSizes = Array.from(selectedSizes).sort((a, b) => a - b);

        sortedSizes.forEach(size => {
            const tag = document.createElement('span');
            tag.className = 'size-tag';
            tag.textContent = `${size}px `; // 텍스트와 삭제 버튼 사이 간격

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&times;'; // 'x' 문자
            removeBtn.title = '삭제';
            removeBtn.onclick = () => {
                selectedSizes.delete(size);
                renderSelectedSizes(); // 목록 다시 렌더링
            };
            tag.appendChild(removeBtn);
            selectedSizesContainer.appendChild(tag);
        });
    }

    addSizeButton.addEventListener('click', () => {
        const sizeValue = parseInt(widthInput.value, 10);
        if (sizeValue && sizeValue > 0) {
            if (selectedSizes.has(sizeValue)) {
                alert('이미 추가된 사이즈입니다.');
            } else {
                selectedSizes.add(sizeValue);
                renderSelectedSizes(); // 변경된 목록으로 화면 업데이트
            }
            widthInput.value = ''; // 입력 필드 비우기
            widthInput.focus(); // 다시 입력 필드에 포커스
        } else {
            alert('유효한 가로 사이즈를 입력해주세요.');
        }
    });
    // Enter 키로도 사이즈 추가 가능하도록
    widthInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // 폼 제출 방지
            addSizeButton.click();
        }
    });


    resizeAndDownloadButton.addEventListener('click', async () => {
        const targetWidths = Array.from(selectedSizes); // Set을 배열로 변환

        if (targetWidths.length === 0) {
            alert('리사이즈할 사이즈를 하나 이상 추가해주세요.');
            return;
        }

        if (!croppedPreview.src || croppedPreview.src === '#') {
            alert('리사이즈할 크롭된 이미지가 없습니다.');
            return;
        }

        resizeLoadingSpinner.style.display = 'block';
        downloadLinksContainer.innerHTML = '';

        const sourceImage = new Image();
        sourceImage.onload = async () => {
            for (const width of targetWidths) {
                const targetCanvas = document.createElement('canvas');
                targetCanvas.width = width;
                targetCanvas.height = width; // 정사각형

                try {
                    await picaInstance.resize(sourceImage, targetCanvas, { /* alpha: true */ });
                    const resizedImageDataURL = targetCanvas.toDataURL('image/png');
                    
                    const linkDiv = document.createElement('div');
                    const infoSpan = document.createElement('span');
                    infoSpan.textContent = `${originalFileName}_cropped_${width}x${width}.png`;
                    
                    const downloadLink = document.createElement('a');
                    downloadLink.href = resizedImageDataURL;
                    downloadLink.download = `${originalFileName}_cropped_${width}x${width}.png`;
                    downloadLink.textContent = `다운로드 (${width}px)`;
                    downloadLink.role = 'button';

                    linkDiv.appendChild(infoSpan);
                    linkDiv.appendChild(downloadLink);
                    downloadLinksContainer.appendChild(linkDiv);

                } catch (error) {
                    console.error('Pica 리사이즈 오류:', error);
                    const errorMsg = document.createElement('p');
                    errorMsg.textContent = `${width}px 리사이즈 중 오류 발생: ${error.message}`;
                    errorMsg.style.color = 'red';
                    downloadLinksContainer.appendChild(errorMsg);
                }
            }
            resizeLoadingSpinner.style.display = 'none';
            if (downloadLinksContainer.children.length === 0 && targetWidths.length > 0) {
                 downloadLinksContainer.innerHTML = '<p><em>리사이즈된 이미지를 생성하지 못했습니다. 오류를 확인해주세요.</em></p>';
            } else if (targetWidths.length === 0) {
                 downloadLinksContainer.innerHTML = '<p><em>리사이즈할 사이즈가 없습니다.</em></p>';
            }
        };
        sourceImage.onerror = () => {
            alert('크롭된 이미지를 불러오는데 실패했습니다.');
            resizeLoadingSpinner.style.display = 'none';
        }
        sourceImage.src = croppedPreview.src;
    });

    backToCropButton.addEventListener('click', () => {
        resizeView.style.display = 'none';
        cropView.style.display = 'block';
        
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        imageToCrop.src = '#';
        imageToCrop.style.display = 'none';
        cropConfirmButton.style.display = 'none';
        originalFileName = '';
        selectedSizes.clear();
        renderSelectedSizes();
        widthInput.value = '';
    });
});
