import React from 'react';
import { Card } from 'primereact/card';

const MyCardsComponent: React.FC = () => {
  const cardData = [
    {
      title: 'Card 1',
      description: 'Contenu de la première carte.',
      image: 'https://via.placeholder.com/150',
    },
    {
      title: 'Card 2',
      description: 'Contenu de la deuxième carte.',
      image: 'https://via.placeholder.com/150',
    },
    {
      title: 'Card 3',
      description: 'Contenu de la troisième carte.',
      image: 'https://via.placeholder.com/150',
    },
    {
      title: 'Card 4',
      description: 'Contenu de la quatrième carte.',
      image: 'https://via.placeholder.com/150',
    },
  ];

  return (
    <div className="p-grid p-dir-col p-align-center p-m-4" style={{ gap: '1rem' }}>
      {cardData.map((card, index) => (
        <Card
          key={index}
          title={card.title}
          header={
            <img
              src={card.image}
              alt={card.title}
              style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }}
            />
          }
        >
          <p>{card.description}</p>
        </Card>
      ))}
    </div>
  );
};

export default MyCardsComponent;
