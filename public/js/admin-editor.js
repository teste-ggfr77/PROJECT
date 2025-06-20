let editMode = false;
const editableElements = document.querySelectorAll('[data-editable="true"]');

function toggleEditMode() {
    editMode = !editMode;
    editableElements.forEach(el => {
        el.contentEditable = editMode;
        el.classList.toggle('editing', editMode);
    });
}

async function savePage() {
    const sections = [];
    document.querySelectorAll('[data-section-id]').forEach(section => {
        const sectionData = {
            id: section.dataset.sectionId,
            type: section.dataset.sectionType,
            data: {}
        };
        
        section.querySelectorAll('[data-editable="true"]').forEach(el => {
            sectionData.data[el.dataset.field] = el.innerText;
        });
        
        sections.push(sectionData);
    });

    try {
        const response = await fetch('/api/admin/save-page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sections })
        });
        
        if (response.ok) {
            alert('Changes saved successfully!');
        }
    } catch (error) {
        console.error('Error saving changes:', error);
        alert('Error saving changes');
    }
}
