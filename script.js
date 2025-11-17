const buttons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('section');

// Default: show home only
showSection('home');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        showSection(target);
    });
});

function showSection(id) {
    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === id) {
            section.classList.add('active');
        }
    });
}

$(document).ready(function () {

    // Load Menu Items
    $("#loadMenu").click(function () {
        $("#loader").show();
        $.getJSON("menu.json", function (data) {
            setTimeout(() => {
                $("#loader").hide();
                $("#menuList").empty();
                $.each(data, function (i, item) {
                    $("#menuList").append(
                        `<div class="menu-item">${item.item}<br><span>${item.price}</span></div>`
                    );
                });
            }, 800);
        });
    });

    // FORM Validation + AJAX
    document.getElementById("contactForm").addEventListener("submit", function (e) {
        e.preventDefault();

        let name = document.getElementById("name").value.trim();
        let email = document.getElementById("email").value.trim();
        let mobile = document.getElementById("mobile").value.trim();
        let message = document.getElementById("message").value.trim();
        let status = document.getElementById("form-status");

        if (name.length < 3 || !/^[A-Za-z ]+$/.test(name)) {
            status.textContent = "Please enter a valid name (min 3 letters, no numbers).";
            status.style.color = "red";
            return;
        }

        let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            status.textContent = "Please enter a valid email address.";
            status.style.color = "red";
            return;
        }

        const phoneInput = document.getElementById("phone");

        phoneInput.addEventListener("input", function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length > 10) {
                this.value = this.value.slice(0, 10);
            }
        });

        if (message.length < 10) {
            status.textContent = "Message should be at least 10 characters.";
            status.style.color = "red";
            return;
        }

        status.textContent = "Form submitted successfully! Thank you!";
        status.style.color = "green";
        document.getElementById("contactForm").reset();

    });
    debugger;
    function validatePhone() {
        let phone = document.getElementById("phone").value.trim();
        let errorMsg = document.getElementById("phone-error");

        if (!/^[6-9][0-9]{9}$/.test(phone)) {
            errorMsg.textContent = "Phone number must be 10 digits and start with 6, 7, 8, or 9.";
            return false;
        } else {
            errorMsg.textContent = "";
            return true;
        }
    }

    // Contact form AJAX
    $("#contactForm").submit(function (e) {
        e.preventDefault();

        $.ajax({
            url: "save.txt",
            type: "POST",
            data: $(this).serialize(),
            success: function () {
                $("#popup").css("display", "flex");
                $("#contactForm")[0].reset();
            }
        });
        document.getElementById("contactForm").addEventListener("submit", function (e) {
            e.preventDefault();

            if (!validatePhone()) return;
            alert("Form Submitted Successfully!");
            this.reset();
            location.reload();
        });

    });

    $("#closePopup").click(function () {
        $("#popup").hide();
    });


});
