import type { Property } from '@/types/schema';
import Link from 'next/link';

type PropertyStatusGridProps = {
    properties: Property[];
};

export default function PropertyStatusGrid({ properties }: PropertyStatusGridProps) {
    return (
        <section className="section">
            <div className="section__inner">
                <div className="card__header" style={{ marginBottom: '2rem' }}>
                    <h2 className="card__title">Your Properties</h2>
                    <Link href="/admin/properties" className="ghost-button">Manage All</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <div key={property.id} className="card shadow-md hover:shadow-lg transition-shadow duration-300">
                            <div className="card__body">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold">{property.name}</h3>
                                    <span className={`tag ${property.status === 'occupied' ? 'tag--info' : 'tag--success'
                                        }`}>
                                        {property.status}
                                    </span>
                                </div>
                                <p className="text-gray-600 mb-4">{property.address.street}, {property.address.city}</p>
                                <div className="border-t pt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Rent</span>
                                        <span className="font-semibold">${property.defaultRentAmount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {properties.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg col-span-full">
                            <p className="text-gray-500 italic">No properties assigned to your account yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
