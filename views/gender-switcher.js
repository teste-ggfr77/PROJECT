// Gender switcher for men/women using JSON and localStorage

document.addEventListener('DOMContentLoaded', function() {
  const genderSwitcher = document.getElementById('gender-switcher');
  if (!genderSwitcher) return;

  // Load gender from localStorage or default to 'men'
  let gender = localStorage.getItem('gender') || 'men';
  genderSwitcher.value = gender;

  genderSwitcher.addEventListener('change', function() {
    gender = genderSwitcher.value;
    localStorage.setItem('gender', gender);
    // Redirect to the selected gender's page
    window.location.href = `/${gender}`;
  });
});
