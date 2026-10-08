import { useTabs, type Edge } from 'biombo/react';

export function TabStrip({ edge, titles }: { edge: Edge; titles: Record<string, string> }) {
    const tabs = useTabs({ edge });
    if (tabs.ids.length < 2) {
        return null;
    }
    return (
        <div {...tabs.getTabListProps()} className="tabs" data-testid={`tabs-${edge}`}>
            {tabs.ids.map((id) => (
                <button key={id} type="button" className="tab" {...tabs.getTabProps(id)}>
                    {titles[id] ?? id}
                </button>
            ))}
        </div>
    );
}
