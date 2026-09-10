
const stampInput =
  document.getElementById(
    'stampSignature'
  );


const stampPreview =
  document.getElementById(
    'stampPreview'
  );


const stampPreviewContainer =
  document.getElementById(
    'stampPreviewContainer'
  );


if (stampInput) {

  stampInput.addEventListener(
    'change',
    function () {

      const file =
        this.files[0];


      if (!file) {

        stampPreviewContainer.style.display =
          'none';

        return;

      }


      const reader =
        new FileReader();


      reader.onload =
        function (event) {

          stampPreview.src =
            event.target.result;


          stampPreviewContainer.style.display =
            'block';

        };


      reader.readAsDataURL(
        file
      );

    }
  );

}
