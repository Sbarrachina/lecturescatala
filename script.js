
const bookList = document.getElementById('book-list');
const authorFilter = document.getElementById('author-filter');
let db;

// Abrimos (o creamos) la base de datos llamada 'bookDatabase'
const request = indexedDB.open('bookDatabase', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    // Creamos un almacén de objetos llamado 'books' con la clave primaria 'id'
    db.createObjectStore('books', { keyPath: 'id' });
};

request.onsuccess = function(event) {
    db = event.target.result;
    updateBookList();  // Actualiza la lista de libros cuando la base de datos esté lista
    updateAuthorFilter();
};

request.onerror = function(event) {
    console.error('Error al abrir IndexedDB:', event.target.errorCode);
};

function addBook() {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const cover = document.getElementById('cover').value;

    if (title && author && cover) {
        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');

        // Creamos el libro con un ID único basado en la fecha actual
        const book = { id: Date.now().toString(), title, author, cover, liked: false, disliked: false };
        
        objectStore.put(book); // Guardar el libro en IndexedDB
        
        transaction.oncomplete = () => {
            updateBookList();
            updateAuthorFilter();
            document.getElementById('title').value = '';
            document.getElementById('author').value = '';
            document.getElementById('cover').value = '';
        };
        
        transaction.onerror = (event) => {
            console.error('Error al guardar el libro en IndexedDB:', event.target.errorCode);
        };
    }
}

function updateBookList() {
    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        bookList.innerHTML = '';
        books.forEach((book, index) => {
            const bookItem = createBookElement(book, index);
            bookList.appendChild(bookItem);
        });
    };
}

function createBookElement(book, index) {
    const bookItem = document.createElement('div');
    bookItem.className = 'book-item';
    bookItem.innerHTML = `
        <img src="${book.cover}" alt="${book.title}">
        <p><strong>${book.title}</strong></p>
        <p>${book.author}</p>
        <label class="like-checkbox">
            <input type="checkbox" ${book.liked ? 'checked' : ''} onchange="toggleLike('${book.id}')"> M'agrada
        </label>
        <label class="dislike-checkbox">
            <input type="checkbox" ${book.disliked ? 'checked' : ''} onchange="toggleDislike('${book.id}')"> No m'agrada
        </label>
        <div>
            <button onclick="editBook('${book.id}')">Editar</button>
            <button onclick="deleteBook('${book.id}')">Esborrar</button>
        </div>
    `;
    return bookItem;
}

function editBook(id) {
    const transaction = db.transaction(['books'], 'readwrite');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const book = event.target.result;
        const newTitle = prompt('Introdueix el nou títol del llibre', book.title);
        const newAuthor = prompt('Introdueix el nou autor del llibre', book.author);
        const newCover = prompt('Introdueix la nova URL de la portada', book.cover);

        if (newTitle !== null && newAuthor !== null && newCover !== null) {
            book.title = newTitle;
            book.author = newAuthor;
            book.cover = newCover;

            objectStore.put(book); // Guardar cambios en IndexedDB
            transaction.oncomplete = updateBookList;
            transaction.onerror = (event) => {
                console.error('Error al editar el libro:', event.target.errorCode);
            };
        }
    };
}

function deleteBook(id) {
    const confirmDelete = confirm(`Estàs segur d'esborrar aquest llibre?`);
    if (confirmDelete) {
        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');
        objectStore.delete(id);

        transaction.oncomplete = updateBookList;
        transaction.onerror = (event) => {
            console.error('Error al eliminar el libro:', event.target.errorCode);
        };
    }
}

function toggleLike(id) {
    const transaction = db.transaction(['books'], 'readwrite');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const book = event.target.result;
        book.liked = !book.liked;
        if (book.liked) {
            book.disliked = false;
        }
        objectStore.put(book);
        transaction.oncomplete = updateBookList;
    };
}

function toggleDislike(id) {
    const transaction = db.transaction(['books'], 'readwrite');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const book = event.target.result;
        book.disliked = !book.disliked;
        if (book.disliked) {
            book.liked = false;
        }
        objectStore.put(book);
        transaction.oncomplete = updateBookList;
    };
}

function updateAuthorFilter() {
    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        const authors = [...new Set(books.map(book => book.author))].sort();

        authorFilter.innerHTML = '<option value="">Filtrar per autor</option>';
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            authorFilter.appendChild(option);
        });
    };
}

function filterByAuthor() {
    const selectedAuthor = authorFilter.value.trim();

    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        const filteredBooks = books.filter(book => {
            return book.author.trim().toLowerCase() === selectedAuthor.toLowerCase();
        });

        updateBookListFiltered(filteredBooks);
    };
}

function updateBookListFiltered(filteredBooks) {
    bookList.innerHTML = '';

    if (filteredBooks.length === 0) {
        const noResultsItem = document.createElement('div');
        noResultsItem.textContent = 'No hay libros para este autor.';
        bookList.appendChild(noResultsItem);
    } else {
        filteredBooks.forEach((book, index) => {
            const bookItem = createBookElement(book, index);
            bookList.appendChild(bookItem);
        });
    }
}

