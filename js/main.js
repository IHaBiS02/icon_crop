document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const cropView = document.getElementById('crop-view');
    const resizeView = document.getElementById('resize-view');

    const imageUpload = document.getElementById('imageUpload');
    const imageToCrop = document.getElementById('imageToCrop');
    const cropConfirmButton = document.getElementById('cropConfirmButton');
    const cropLoadingSpinner = document.getElementById('cropLoadingSpinner');

    const croppedPreview = document.getElementById('croppedPreview');
    const sizeInputContainer = document.getElementById('sizeInputContainer');
    const addSizeInputButton = document.getElementById('addSizeInputButton');
    const resizeAndDownloadButton = document.getElementById('resizeAndDownloadButton');
    const resizeLoadingSpinner = document.getElementById('resizeLoadingSpinner');
    const downloadLinksContainer = document.getElementById('downloadLinksContainer');
    const backToCropButton = document.getElementById('backToCropButton');

    let cropper = null; // Cropper.js 인스턴스
    let originalFileName = ''; // 원본 파일명 (확장자 제외)
    const picaInstance = pica(); // Pica.js 인스턴스

    // --- 1단계: 이미지 업로드 및 크롭 ---

    imageUpload.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            originalFileName = file.name.split('.').slice(0, -1).join('.'); // 확장자 제거
            const reader = new FileReader();

            cropLoadingSpinner.style.display = 'block'; // 로딩 시작
            imageToCrop.style.display = 'none'; // 이전 이미지 숨기기
            cropConfirmButton.style.display = 'none'; // 버튼 숨기기

            reader.onload = (e) => {
                imageToCrop.src = e.target.result;
                imageToCrop.style.display = 'block';

                if (cropper) {
                    cropper.destroy(); // 기존 Cropper 인스턴스 파괴
                }
                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 1 / 1, // 정사각형 비율
                    viewMode: 1,        // 크롭 박스가 캔버스를 벗어나지 않도록 제한
                    background: false,  // 크롭 영역 외 배경 숨김
                    movable: true,
                    zoomable: true,
                    rotatable: false,
                    scalable: false,
                    guides: true,
                    center: true,
                    highlight: true,
                    cropBoxResizable: true,
                    dragMode: 'move', // 드래그 모드
                    ready: () => {
                        cropLoadingSpinner.style.display = 'none'; // 로딩 완료
                        cropConfirmButton.style.display = 'block'; // 크롭 버튼 표시
                    }
                });
            };
            reader.readAsDataURL(file);
        } else {
            // 파일 선택 안 했을 때 처리 (예: 기존 크로퍼 제거)
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

        // Cropper.js에서 크롭된 이미지를 Canvas로 가져오기
        const croppedCanvas = cropper.getCroppedCanvas({
            // 고화질을 위해 크롭된 영역의 실제 크기보다 크게 설정할 수 있음
            // 예: width: 1000, height: 1000 (정사각형이므로 동일)
            // fillStyle: '#fff' // 배경색이 필요한 경우
        });

        if (!croppedCanvas) {
            alert('이미지를 크롭하는데 실패했습니다.');
            cropLoadingSpinner.style.display = 'none';
            return;
        }

        const croppedImageDataURL = croppedCanvas.toDataURL('image/png'); // PNG로 저장
        croppedPreview.src = croppedImageDataURL;

        // 화면 전환
        cropView.style.display = 'none';
        resizeView.style.display = 'block';
        cropLoadingSpinner.style.display = 'none';

        // 리사이즈 섹션 초기화
        downloadLinksContainer.innerHTML = '<p><em>리사이즈된 이미지가 준비되면 여기에 표시됩니다.</em></p>';
        // 기존 사이즈 입력 필드들 (첫번째 제외) 제거
        const extraInputs = sizeInputContainer.querySelectorAll('input[type="number"]:not(:first-child)');
        extraInputs.forEach(input => input.parentElement.remove()); // PicoCSS grid 구조 고려
        sizeInputContainer.querySelector('input[type="number"]').value = ''; // 첫번째 필드 값 초기화
    });

    // --- 2단계: 리사이즈 및 다운로드 ---

    addSizeInputButton.addEventListener('click', () => {
        const newInputContainer = document.createElement('div'); // PicoCSS grid item
        const newInput = document.createElement('input');
        newInput.type = 'number';
        newInput.className = 'width-input';
        newInput.placeholder = '예: 150';

        const removeButton = document.createElement('button');
        removeButton.textContent = '삭제';
        removeButton.className = 'contrast outline pico-button-small'; // Pico.css 스타일 적용
        removeButton.style.marginLeft = '0.5rem';
        removeButton.style.padding = '0.25rem 0.5rem'; // 버튼 크기 조절
        removeButton.type = 'button'; // submit 방지
        removeButton.onclick = () => {
            newInputContainer.remove();
        };

        newInputContainer.appendChild(newInput);
        newInputContainer.appendChild(removeButton);
        sizeInputContainer.appendChild(newInputContainer);
    });

    resizeAndDownloadButton.addEventListener('click', async () => {
        const widthInputs = sizeInputContainer.querySelectorAll('.width-input');
        const targetWidths = [];
        widthInputs.forEach(input => {
            const val = parseInt(input.value, 10);
            if (val && val > 0) {
                targetWidths.push(val);
            }
        });

        if (targetWidths.length === 0) {
            alert('유효한 가로 사이즈를 하나 이상 입력해주세요.');
            return;
        }

        if (!croppedPreview.src || croppedPreview.src === '#') {
            alert('리사이즈할 크롭된 이미지가 없습니다.');
            return;
        }

        resizeLoadingSpinner.style.display = 'block';
        downloadLinksContainer.innerHTML = ''; // 이전 링크들 제거

        const sourceImage = new Image();
        sourceImage.onload = async () => {
            for (const width of targetWidths) {
                const targetCanvas = document.createElement('canvas');
                targetCanvas.width = width;
                // 정사각형이므로 높이도 동일하게 설정
                targetCanvas.height = width;

                try {
                    // Pica.js로 리사이즈
                    await picaInstance.resize(sourceImage, targetCanvas, {
                        // unsharpAmount: 80, // 선명도 조절 (필요시)
                        // unsharpRadius: 0.6,
                        // unsharpThreshold: 2,
                        // alpha: true // 투명도 유지
                    });

                    const resizedImageDataURL = targetCanvas.toDataURL('image/png'); // PNG로 저장
                    
                    const linkDiv = document.createElement('div');
                    const infoSpan = document.createElement('span');
                    infoSpan.textContent = `${originalFileName}_cropped_${width}x${width}.png`;
                    
                    const downloadLink = document.createElement('a');
                    downloadLink.href = resizedImageDataURL;
                    downloadLink.download = `${originalFileName}_cropped_${width}x${width}.png`;
                    downloadLink.textContent = `다운로드 (${width}px)`;
                    downloadLink.role = 'button'; // Pico.css 버튼 스타일 적용

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
            if (downloadLinksContainer.children.length === 0) {
                 downloadLinksContainer.innerHTML = '<p><em>리사이즈된 이미지를 생성하지 못했습니다.</em></p>';
            }
        };
        sourceImage.onerror = () => {
            alert('크롭된 이미지를 불러오는데 실패했습니다.');
            resizeLoadingSpinner.style.display = 'none';
        }
        sourceImage.src = croppedPreview.src; // 크롭된 이미지 데이터 URL
    });

    backToCropButton.addEventListener('click', () => {
        resizeView.style.display = 'none';
        cropView.style.display = 'block';
        
        // 크롭 뷰 초기화 (선택 사항: 파일 입력 필드 초기화 등)
        // imageUpload.value = ''; // 파일 입력 필드 초기화 (보안상 일부 브라우저에서 작동안할 수 있음)
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        imageToCrop.src = '#';
        imageToCrop.style.display = 'none';
        cropConfirmButton.style.display = 'none';
        originalFileName = '';
    });
});
