document.addEventListener('DOMContentLoaded', function() {
    // Initialize Sortable
    const sortableList = document.getElementById('sortable-contents');
    if (sortableList) {
        const sortable = Sortable.create(sortableList, {
            animation: 150,
            handle: '.cursor-move',
            onEnd: async function() {
                const items = Array.from(sortableList.getElementsByTagName('tr')).map((row, index) => ({
                    id: row.dataset.id,
                    order: index + 1
                }));

                try {
                    const response = await fetch('/admin/api/content/reorder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                        },
                        body: JSON.stringify({ items })
                    });

                    if (!response.ok) {
                        throw new Error('Reordering failed');
                    }
                } catch (error) {
                    console.error('Error reordering contents:', error);
                    alert('Failed to save the new order. Please refresh and try again.');
                }
            }
        });
    }

    // Handle inline editing
    document.addEventListener('click', async function(e) {
        if (e.target.matches('.edit-content-btn')) {
            const contentId = e.target.closest('tr').dataset.id;
            // Load content details into modal
            try {
                const response = await fetch(`/admin/api/content/${contentId}`);
                const data = await response.json();
                if (data.success) {
                    populateEditModal(data.content);
                }
            } catch (error) {
                console.error('Error loading content:', error);
                alert('Failed to load content details');
            }
        }
        
        if (e.target.matches('.delete-content-btn')) {
            if (confirm('Are you sure you want to delete this content?')) {
                const contentId = e.target.closest('tr').dataset.id;
                try {
                    const response = await fetch(`/admin/api/content/${contentId}`, {
                        method: 'DELETE',
                        headers: {
                            'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                        }
                    });

                    if (response.ok) {
                        e.target.closest('tr').remove();
                    } else {
                        throw new Error('Delete failed');
                    }
                } catch (error) {
                    console.error('Error deleting content:', error);
                    alert('Failed to delete content');
                }
            }
        }

        if (e.target.matches('.toggle-status-btn')) {
            const contentId = e.target.closest('tr').dataset.id;
            const currentStatus = e.target.dataset.status;
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            try {
                const response = await fetch(`/admin/api/content/${contentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    e.target.dataset.status = newStatus;
                    e.target.classList.toggle('btn-success');
                    e.target.classList.toggle('btn-secondary');
                    e.target.innerHTML = newStatus === 'active' ? 
                        '<i class="fas fa-toggle-on"></i> Active' : 
                        '<i class="fas fa-toggle-off"></i> Inactive';
                } else {
                    throw new Error('Status update failed');
                }
            } catch (error) {
                console.error('Error updating status:', error);
                alert('Failed to update status');
            }
        }
    });

    // Handle form submissions
    const addContentForm = document.getElementById('addContentForm');
    if (addContentForm) {
        addContentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            try {
                const response = await fetch('/admin/api/content', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to add content');
                }

                const result = await response.json();
                if (result.success) {
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error adding content:', error);
                alert('Failed to add content');
            }
        });
    }

    const editContentForm = document.getElementById('editContentForm');
    if (editContentForm) {
        editContentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const contentId = this.dataset.contentId;
            
            try {
                const response = await fetch(`/admin/api/content/${contentId}`, {
                    method: 'PUT',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to update content');
                }

                const result = await response.json();
                if (result.success) {
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error updating content:', error);
                alert('Failed to update content');
            }
        });
    }
});

function populateEditModal(content) {
    const form = document.getElementById('editContentForm');
    if (!form) return;

    form.dataset.contentId = content._id;
    
    // Populate form fields
    form.querySelector('[name="type"]').value = content.type;
    form.querySelector('[name="title"]').value = content.title;
    form.querySelector('[name="subtitle"]').value = content.subtitle || '';
    form.querySelector('[name="description"]').value = content.description || '';
    form.querySelector('[name="buttonText"]').value = content.buttonText || '';
    form.querySelector('[name="buttonLink"]').value = content.buttonLink || '';
    form.querySelector('[name="backgroundColor"]').value = content.backgroundColor || '';
    form.querySelector('[name="textColor"]').value = content.textColor || '';
    form.querySelector('[name="layout"]').value = content.layout || '';
    form.querySelector('[name="customClass"]').value = content.customClass || '';
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editContentModal'));
    modal.show();
}
