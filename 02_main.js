<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Inscription [Number] - Random Variant</title>
    <style>
        body {
            background-color: #2c1e2f; /* Dark background like your image */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .face {
            width: 200px;
            height: 200px;
            background-color: white;
            border-radius: 50%;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .eye {
            width: [random_eye_size]px;
            height: [random_eye_size]px;
            background-color: black;
            border-radius: 50%;
            position: absolute;
            top: 40%;
        }
        .left-eye { left: 25%; }
        .right-eye { right: 25%; }
        .mouth {
            width: 80px;
            height: 40px;
            background-color: black;
            border-radius: 50% / 0% 0% 100% 100%;
            position: absolute;
            bottom: 20%;
        }
    </style>
</head>
<body>
    <div class="face" style="background-color: [random_face_color];">
        <div class="eye left-eye"></div>
        <div class="eye right-eye"></div>
        <div class="mouth"></div>
    </div>

    <script>
        // Random color generator (returns HEX color)
        function getRandomColor() {
            const letters = '0123456789ABCDEF';
            let color = '#';
            for (let i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }

        // Random eye size (between 20px and 50px, for example)
        function getRandomEyeSize() {
            return Math.floor(Math.random() * 31) + 20; // Random between 20 and 50
        }

        // Apply randomness
        const face = document.querySelector('.face');
        const eyes = document.querySelectorAll('.eye');

        // Random face color
        face.style.backgroundColor = getRandomColor();

        // Random eye size
        eyes.forEach(eye => {
            eye.style.width = `${getRandomEyeSize()}px`;
            eye.style.height = `${getRandomEyeSize()}px`;
        });

        // Optional: Random background color for the body
        document.body.style.backgroundColor = getRandomColor();
    </script>
</body>
</html>