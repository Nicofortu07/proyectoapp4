// ==========================================
// main.js - CRUD Completo y Catálogo Dinámico
// ==========================================

const formSerie = document.getElementById('form-serie');
const inputSerieId = document.getElementById('serie-id');
const formTituloHeader = document.getElementById('form-titulo');
const inputTitulo = document.getElementById('titulo');
const selectGenero = document.getElementById('genero');
const inputPuntuacion = document.getElementById('puntuacion');
const inputImagenFile = document.getElementById('imagen_file');
const inputImagenUrl = document.getElementById('imagen_url');
const textareaResena = document.getElementById('resena');
const btnSubmit = document.getElementById('btn-submit');
const gridSeries = document.getElementById('grid-series');

// 1. Cargar catálogo al iniciar la página
document.addEventListener('DOMContentLoaded', cargarSeries);

// 2. Consulta y Renderizado de Tarjetas (SELECT)
async function cargarSeries() {
  if (!gridSeries) return;
  
  gridSeries.innerHTML = '<p class="loading">Cargando recomendaciones...</p>';

  try {
    const { data: series, error } = await supabaseClient
      .from('series')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    gridSeries.innerHTML = '';

    if (!series || series.length === 0) {
      gridSeries.innerHTML = '<p class="empty">No hay recomendaciones publicadas aún.</p>';
      return;
    }

    series.forEach(serie => {
      const card = document.createElement('article');
      card.classList.add('card-serie');

      const imgPortada = serie.imagen_url || 'https://via.placeholder.com/300x450?text=Sin+Portada';

      card.innerHTML = `
        <img src="${imgPortada}" alt="${serie.titulo}" class="card-img">
        <div class="card-body">
          <span class="badge-genero">${serie.genero}</span>
          <h3 class="card-title">${serie.titulo}</h3>
          <p class="card-puntuacion">⭐ ${serie.puntuacion} / 5</p>
          <p class="card-resena">${serie.resena}</p>
          <div class="card-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button onclick="prepararEdicion(${serie.id})" class="btn-editar" style="padding: 0.4rem 0.8rem; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">Editar</button>
            <button onclick="eliminarSerie(${serie.id})" class="btn-eliminar" style="padding: 0.4rem 0.8rem; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
          </div>
        </div>
      `;
      gridSeries.appendChild(card);
    });

  } catch (err) {
    console.error('Error al cargar series:', err.message);
    gridSeries.innerHTML = '<p class="error">Error al obtener las recomendaciones.</p>';
  }
}

// 3. Subida de imágenes a Supabase Storage
async function subirImagen(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { data, error } = await supabaseClient
    .storage
    .from('portadas')
    .upload(fileName, file);

  if (error) throw error;

  const { data: publicUrlData } = supabaseClient
    .storage
    .from('portadas')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// 4. Preparar formulario para Edición (Carga datos en los inputs)
window.prepararEdicion = async (id) => {
  try {
    const { data: serie, error } = await supabaseClient
      .from('series')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Asignar los datos del registro a los controles
    inputSerieId.value = serie.id;
    inputTitulo.value = serie.titulo;
    selectGenero.value = serie.genero;
    inputPuntuacion.value = serie.puntuacion;
    inputImagenUrl.value = serie.imagen_url;
    textareaResena.value = serie.resena;

    // Cambiar aspecto del formulario a Modo Edición
    formTituloHeader.textContent = 'Editar Recomendación';
    btnSubmit.textContent = 'Guardar Cambios';
    btnSubmit.classList.add('btn-warning');

    // Desplazamiento suave hacia el formulario
    formSerie.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Error al obtener la serie:', err.message);
    alert('❌ No se pudieron cargar los datos para editar.');
  }
};

// 5. Eliminar un registro de Supabase (DELETE)
window.eliminarSerie = async (id) => {
  const confirmacion = confirm('¿Estás seguro de que querés eliminar esta recomendación?');
  if (!confirmacion) return;

  try {
    const { error } = await supabaseClient
      .from('series')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('🗑️ Recomendación eliminada.');
    cargarSeries(); // Actualizar listado

  } catch (err) {
    console.error('Error al eliminar:', err.message);
    alert('❌ Error al eliminar la recomendación: ' + err.message);
  }
};

// 6. Restablecer el formulario al Modo Alta
function limpiarFormulario() {
  formSerie.reset();
  inputSerieId.value = '';
  formTituloHeader.textContent = 'Recomendar una Serie';
  btnSubmit.textContent = 'Publicar Recomendación';
  btnSubmit.classList.remove('btn-warning');
}

// 7. Evento Submit: Detecta si realiza INSERT o UPDATE
if (formSerie) {
  formSerie.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Procesando...';

    try {
      let finalImageUrl = inputImagenUrl.value.trim();

      if (inputImagenFile && inputImagenFile.files && inputImagenFile.files[0]) {
        const file = inputImagenFile.files[0];
        finalImageUrl = await subirImagen(file);
      }

      if (!finalImageUrl) {
        alert('Por favor seleccioná una imagen o ingresá una URL válida.');
        btnSubmit.disabled = false;
        btnSubmit.textContent = inputSerieId.value ? 'Guardar Cambios' : 'Publicar Recomendación';
        return;
      }

      const datosSerie = {
        titulo: inputTitulo.value.trim(),
        genero: selectGenero.value,
        puntuacion: parseFloat(inputPuntuacion.value),
        imagen_url: finalImageUrl,
        resena: textareaResena.value.trim()
      };

      const idEditar = inputSerieId.value;

      if (idEditar) {
        // Ejecutar UPDATE
        const { error } = await supabaseClient
          .from('series')
          .update(datosSerie)
          .eq('id', idEditar);

        if (error) throw error;
        alert('✏️ ¡Recomendación actualizada con éxito!');
      } else {
        // Ejecutar INSERT
        const { error } = await supabaseClient
          .from('series')
          .insert([datosSerie]);

        if (error) throw error;
        alert('✅ ¡Recomendación publicada con éxito!');
      }

      limpiarFormulario();
      cargarSeries();

    } catch (err) {
      console.error('Error al guardar:', err);
      alert('❌ Ocurrió un error: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = inputSerieId.value ? 'Guardar Cambios' : 'Publicar Recomendación';
    }
  });
}