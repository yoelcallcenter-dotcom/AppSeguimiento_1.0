import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HelpPanel from './HelpPanel';
import { HelpProvider } from '../../help';
import { TourProvider } from '../../tour';
import { UXProvider } from '../../context/UXContext';

const renderHelp = () =>
  render(
    <HelpProvider>
      <TourProvider>
        <HelpPanel showToast={() => {}} onClose={() => {}} />
      </TourProvider>
    </HelpProvider>
  );

describe('HelpPanel (rediseño grupos)', () => {
  it('renderiza los 5 grupos en el dock', () => {
    renderHelp();
    ['Comenzar', 'Referencia', 'Aprender', 'Sistema', 'Contacto'].forEach((g) => {
      expect(screen.getByRole('button', { name: g })).toBeTruthy();
    });
  });

  it('muestra las sub-pills del grupo por defecto (Comenzar)', () => {
    renderHelp();
    expect(screen.getByRole('button', { name: /^Tour interactivo/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Acerca de Vistas/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Ejemplos de casos/ })).toBeTruthy();
  });

  it('muestra el SectionHeader del Tour por defecto', () => {
    renderHelp();
    expect(screen.getByText(/Un recorrido guiado por todas las funcionalidades/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Comenzar tour/ })).toBeTruthy();
  });

  it('cambia de grupo y muestra su primera sub-sección', () => {
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Referencia' }));
    expect(screen.getByRole('button', { name: /^Preguntas Frecuentes/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Glosario/ })).toBeTruthy();
  });

  it('renderiza Acerca de Vistas sin la tarjeta introspectiva redundante', () => {
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: /^Acerca de Vistas/ }));
    expect(screen.queryByText(/Acá vas a encontrar una explicación completa de cada pantalla/)).toBeNull();
    expect(screen.getByText(/El Dashboard es el panel de control inteligente/)).toBeTruthy();
  });

  it('recorre las 5 pestañas (tur) navegando por grupos', async () => {
    renderHelp();
    const grupos = ['Aprender', 'Sistema', 'Contacto', 'Referencia', 'Comenzar'];
    grupos.forEach((g) => {
      fireEvent.click(screen.getByRole('button', { name: g }));
    });
    expect(screen.getByRole('button', { name: /Comenzar tour/ })).toBeTruthy();
  });

  it('muestra las sub-pills de Sistema con Documentación', () => {
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Sistema' }));
    expect(screen.getByRole('button', { name: /^Documentación/ })).toBeTruthy();
  });

  it('renderiza todos los grupos sin error de elemento inválido', () => {
    renderHelp();
    const gb = screen.getByRole('button', { name: 'Referencia' });
    fireEvent.click(gb);
    expect(screen.getByRole('button', { name: /^Glosario/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Aprender' }));
    expect(screen.getByRole('button', { name: /^Guía PDF/ })).toBeTruthy();
  });

  it('recorre las 9 sub-secciones sin error de elemento inválido', () => {
    renderHelp();
    const grupos = {
      Comenzar: ['Tour interactivo', 'Acerca de Vistas', 'Ejemplos de casos'],
      Referencia: ['Preguntas Frecuentes', 'Glosario'],
      Aprender: ['Atajos de teclado', 'Guía PDF'],
      Sistema: ['Documentación'],
      Contacto: ['Feedback'],
    };
    Object.entries(grupos).forEach(([grupo, subs]) => {
      fireEvent.click(screen.getByRole('button', { name: grupo }));
      subs.forEach((sub) => {
        const pill = screen.getByRole('button', { name: new RegExp(`^${sub}`) });
        fireEvent.click(pill);
        expect(screen.getAllByText(new RegExp(`${sub}`, 'i')).length).toBeGreaterThan(0);
      });
    });
  }, 15000);
});

describe('HelpPanel (alineación y resaltado de tabs, 1.9.2)', () => {
  it('aplica la alineación global por defecto (centro) a Grupos y Secciones', () => {
    renderHelp();
    expect(screen.getByLabelText('Grupos de Ayuda').style.justifyContent).toBe('space-between');
    expect(screen.getByLabelText('Secciones de Ayuda').style.justifyContent).toBe('space-between');
  });

  it('respeta alineacionPestanas=izquierda desde UXContext', () => {
    render(
      <UXProvider config={{ alineacionPestanas: 'izquierda' }}>
        <HelpProvider>
          <TourProvider>
            <HelpPanel showToast={() => {}} onClose={() => {}} />
          </TourProvider>
        </HelpProvider>
      </UXProvider>
    );
    expect(screen.getByLabelText('Grupos de Ayuda').style.justifyContent).toBe('flex-start');
    expect(screen.getByLabelText('Secciones de Ayuda').style.justifyContent).toBe('flex-start');
  });

  it('las tabs inactivas se resaltan por hover (chip + texto alto contraste)', () => {
    renderHelp();
    const grupoInactivo = screen.getByRole('button', { name: 'Referencia' });
    const clases = grupoInactivo.className.split(' ');
    expect(clases).toContain('text-xs');
    expect(clases).toContain('text-[var(--color-text-muted)]');
    expect(clases).toContain('hover:text-[var(--color-text)]');
    expect(clases).toContain('hover:bg-[var(--color-surface2)]');
    expect(clases).not.toContain('bg-[var(--color-surface2)]');
    const seccionInactiva = screen.getByRole('button', { name: /^Acerca de Vistas/ });
    const clasesSeccion = seccionInactiva.className.split(' ');
    expect(clasesSeccion).toContain('text-xs');
    expect(clasesSeccion).toContain('text-[var(--color-text-muted)]');
    expect(clasesSeccion).toContain('border-transparent');
    expect(clasesSeccion).toContain('hover:bg-[var(--color-surface2)]');
  });
});