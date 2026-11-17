/** Navegación inferior entre los dos módulos de la app: Anuncios (muro) y Quejas (buzón). */
import Icono from './Icono.jsx';

export default function NavInferior({ activo }) {
  return (
    <nav className="nav-inferior" aria-label="Secciones">
      <a href="#/inicio" className={activo === 'anuncios' ? 'activo' : ''} aria-current={activo === 'anuncios' ? 'page' : undefined}>
        <Icono nombre="inicio" />Anuncios
      </a>
      <a href="#/quejas" className={activo === 'quejas' ? 'activo' : ''} aria-current={activo === 'quejas' ? 'page' : undefined}>
        <Icono nombre="lista" />Quejas
      </a>
    </nav>
  );
}
