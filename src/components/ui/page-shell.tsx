import { TitleBar, type ActionConfig } from './title-bar';

type PageShellProps = {
    children: React.ReactNode;
    actions?: ActionConfig[];
    title?: string;
};

export const PageShell = ({ children, actions, title }: PageShellProps) => {
    return (
        <>
            <TitleBar title={title} actions={actions} />
            {children}
        </>
    );
};
