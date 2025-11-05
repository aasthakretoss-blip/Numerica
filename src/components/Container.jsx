const Container = ({ nombreCompleto, curp }) => {
    return (
        <section>
            <h2>{nombreCompleto}</h2>
            <p>{curp}</p>
        </section>
    );
};

export default Container;
